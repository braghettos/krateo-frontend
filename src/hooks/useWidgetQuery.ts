/* eslint-disable sort-keys/sort-keys-fix */
/* this rules conflicts with react-query ordering required for correct type inference */

import { useInfiniteQuery, useIsFetching } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router'

import { useConfigContext } from '../context/ConfigContext'
import type { Widget } from '../types/Widget'
import { getAccessToken } from '../utils/getAccessToken'
import { getUserInfo } from '../utils/getUserInfo'
import { forceLogout } from '../utils/logout'

import type { WatchMatcher } from './liveRefresh'
import { getRefreshEntry, isWidgetLiveRefreshEnabled, recordRefreshHeaders } from './refreshSse'
import { useLiveWatch } from './useLiveRefresh'
import { useWidgetLiveRefresh } from './useWidgetLiveRefresh'

function parseNumberParam(param: string | null) {
  const parsed = param ? parseInt(param) : undefined
  return isNaN(parsed!) ? undefined : parsed
}

/** Error carrying the HTTP status so retry logic can tell transient from permanent failures. */
export class WidgetFetchError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'WidgetFetchError'
    this.status = status
  }
}

export const MAX_WIDGET_FETCH_RETRIES = 3

/**
 * Whether a failed widget fetch should be retried. The global QueryClient sets
 * `retry: false`, so without this a backend that has not answered yet (network
 * error / 5xx during startup) lands immediately in the error state — the
 * "red cross on initial render". We retry transient failures and never permanent
 * client errors.
 *
 * 404 is treated as TRANSIENT here: right after a page load/refresh snowplow can
 * answer 404 for a widget endpoint while its informer cache is still cold (the CR
 * exists but isn't listed yet) — that produced an "Error while rendering widget"
 * flash on first paint that recovered on the next fetch. Retrying 404 a few times
 * keeps the skeleton up until the cache warms; a genuinely-missing widget still
 * surfaces the error once the retries are exhausted. The other 4xx (400 bad
 * request, 401 auth, 403 forbidden) stay permanent — retrying them never helps.
 */
export const shouldRetryWidgetFetch = (failureCount: number, error: unknown): boolean => {
  const status = (error as { status?: number } | null)?.status
  if (typeof status === 'number' && status >= 400 && status < 500 && status !== 404) {
    return false
  }
  return failureCount < MAX_WIDGET_FETCH_RETRIES
}

/** Exponential backoff (capped) between widget-fetch retries. */
export const widgetFetchRetryDelay = (attemptIndex: number): number => Math.min(700 * 2 ** attemptIndex, 5000)

/**
 * Build the `?extras=` JSON envelope snowplow forwards into the RESTAction jq dict
 * (its `ParseExtras` reads only this query param; the caller's identity/route are
 * NOT otherwise exposed to RA jq). Sources, later-wins on key collision: the browser
 * URL query (e.g. /search?q=… → `extras.q`), the active route params
 * (e.g. /compositions/:namespace/:name → `extras.namespace`/`extras.name` — the
 * convention's param channel), and the login-provided identity `displayName` +
 * `username` (there is no runtime /me; displayName feeds the greeting, username
 * scopes per-user server state e.g. blueprint drafts). Identity is applied LAST so
 * a spoofed `?displayName=`/`?username=` URL param can never override the
 * authenticated value. Returns '' when empty so the param — and the react-query key
 * it feeds — stay stable (same inputs → same string, no spurious refetch).
 */
export const buildExtrasParam = (
  searchParams: URLSearchParams,
  routeParams: Record<string, string | undefined> = {},
  displayName?: string,
  username?: string,
): string => {
  const extras: Record<string, unknown> = Object.fromEntries(searchParams.entries())
  for (const [key, value] of Object.entries(routeParams)) {
    if (value !== undefined) { extras[key] = value }
  }
  if (displayName) { extras.displayName = displayName }
  if (username) { extras.username = username }
  return Object.keys(extras).length > 0 ? JSON.stringify(extras) : ''
}

export const useWidgetQuery = (widgetEndpoint: string) => {
  const { config } = useConfigContext()
  const [searchParams] = useSearchParams()
  const routeParams = useParams()
  // Extras envelope snowplow forwards into the RESTAction jq dict (`?extras=<json>`):
  // route params (e.g. /compositions/:namespace/:name) + browser URL query (search `q`)
  // + login identity `displayName` (greeting) + `username` (per-user server state, e.g.
  // blueprint drafts). See buildExtrasParam.
  const { displayName, username } = getUserInfo()
  const extrasParam = buildExtrasParam(searchParams, routeParams, displayName, username)

  const widgetFullUrl = `${config!.api.SNOWPLOW_API_BASE_URL}${widgetEndpoint}`
  const requestUrl = new URL(widgetFullUrl)

  // Per-widget live-refresh (snowplow `/refreshes` SSE). The `widgetId` is the
  // serialized query key — stable per (endpoint, extras) — used to key the captured
  // refresh headers and arm the stream. ON by default; per-install kill-switch in config
  // (see refreshSse.isWidgetLiveRefreshEnabled).
  const refreshEnabled = isWidgetLiveRefreshEnabled(config)
  const widgetId = JSON.stringify(['widgets', widgetEndpoint, extrasParam])

  /* TO DEBUG BEFORE SNOWPLOW RETURNS THESE IN THE widgetEndpoint */
  // if (requestUrl.searchParams.get('resource') === 'datagrids') {
  //   requestUrl.searchParams.set('page', '1')
  //   requestUrl.searchParams.set('perPage', '1')
  // }

  const initialPage = parseNumberParam(requestUrl.searchParams.get('page'))
  const initialPerPage = parseNumberParam(requestUrl.searchParams.get('perPage'))

  async function fetchWidget({ page, perPage }: { page?: number; perPage?: number }) {
    /* set new page and perPage to the original requestUrl with updated values */
    if (typeof page === 'number') {
      requestUrl.searchParams.set('page', page.toString())
    }
    if (typeof perPage === 'number') {
      requestUrl.searchParams.set('perPage', perPage.toString())
    }
    if (extrasParam) {
      requestUrl.searchParams.set('extras', extrasParam)
    }

    const urlString = requestUrl.toString()

    // console.log({
    //   kind: url.searchParams.get('resource'),
    //   page: url.searchParams.get('page'),
    //   perPage: url.searchParams.get('perPage'),
    //   urlString,
    // })

    const res = await fetch(urlString, {
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
    })

    if (res.status === 401) {
      // Expired/invalid token → auto-logout: clear the stale session and hard-redirect to
      // /login instead of leaving every widget rendering a silent 401. (Until now only the
      // manual /logout route recovered from an expired token.) Guarded to fire once.
      void forceLogout()
    }
    if (!res.ok) {
      throw new WidgetFetchError(`Widget fetch failed: ${res.status} ${res.statusText}`, res.status)
    }

    // Capture the live-refresh coordination headers from THIS response (so coords +
    // key always match the request that produced them). No-op / cleared when the
    // headers are absent (cache-off, RBAC-skipped, or a snowplow without the class
    // header). `requestUrl.searchParams` already carries the page/perPage/extras used.
    if (refreshEnabled) {
      recordRefreshHeaders(widgetId, requestUrl.searchParams, res.headers)
    }

    const widget = (await res.json()) as Widget
    return widget
  }

  const queryResult = useInfiniteQuery({
    queryKey: ['widgets', widgetEndpoint, extrasParam],
    queryFn: ({ pageParam }) => fetchWidget(pageParam),
    // Override the global `retry: false` for widget data: a backend that is not
    // ready yet should keep showing a loading state and retry, not flash the
    // error "red cross" on first paint. See shouldRetryWidgetFetch.
    retry: shouldRetryWidgetFetch,
    retryDelay: widgetFetchRetryDelay,
    initialPageParam: {
      page: initialPage,
      perPage: initialPerPage,
    },
    getNextPageParam: (lastPage, _allPages, pageParams) => {
      if (typeof pageParams.page !== 'number') {
        // no initial page, so no more pages
        return undefined
      }

      const hasMorePages = typeof lastPage.status === 'object' && lastPage.status?.resourcesRefs?.slice?.continue === true

      if (!hasMorePages) {
        /* to signal there are not other pages */
        return undefined
      }

      return {
        page: pageParams.page + 1,
        perPage: pageParams.perPage,
      }
    },
    // Phase 1 cumulative-slice pagination: each page call returns the
    // complete widget state for the cumulative slice [0 : page * perPage]
    // of the underlying data source. No cross-page merging is needed —
    // the latest page's output IS the current state.
    //
    // The backend does all the work:
    //   - snowplow's widget resolver injects .slice into the widgetDataTemplate
    //     data source so the widget's JQ can cumulatively slice the list.
    //   - The table widget's forPath slices .list[0 : K*perPage] then sorts.
    //   - The piechart widget's indexed forPaths count items in the same
    //     cumulative slice, so values grow monotonically as pages arrive.
    select: (data) => {
      if (data.pages.length === 0) {
        // react-query initial state — return an empty Widget-shaped object
        return data.pages[0]
      }
      return data.pages[data.pages.length - 1]
    },
  })

  // NOTE: Path B (task #188) — the unconditional auto-pagination useEffect
  // that previously lived here was deleted. It fired `fetchNextPage` on
  // every commit where `hasNextPage===true`, walking ALL pages eagerly
  // regardless of viewport. This raced with — and bypassed —
  // ScrollPagination's intersection-observer-driven advance
  // (src/components/Pagination/ScrollPagination.tsx:25-29), making the
  // intersection-observer dead code. With the eager effect gone, page
  // advance is exclusively driven by ScrollPagination when its sentinel
  // enters the viewport, so list-widget cold paint only fetches page 1
  // instead of fanning out N*perPage card /calls upfront.
  //
  // Non-paginating widgets (Page, Panel, Row, Table, Markdown, etc.) are
  // unaffected: `getNextPageParam` returns undefined immediately for them
  // and ScrollPagination is only wired around DataGrid in WidgetRenderer.

  const resourcesRefsPaths = typeof queryResult.data?.status === 'object'
    ? queryResult.data.status.resourcesRefs?.items?.map((item) => item.path) ?? []
    : []

  const resourcesRefsFetching = useIsFetching({
    predicate: (query) => {
      const resourceRefPath = query.queryKey[1] as string

      if (!resourcesRefsPaths) { return false }

      return resourcesRefsPaths.includes(resourceRefPath)
    },
  })

  // Live-refresh (event firehose): a widget can declare widgetData.watch — refetch
  // this query when a matching k8s event arrives (precise, per-widget throttled by
  // the registry). Kept active regardless of the SSE path below; both converge on
  // `refetch` and react-query dedups concurrent refetches.
  const liveStatus = queryResult.data?.status
  const watch = liveStatus && typeof liveStatus === 'object'
    ? (liveStatus.widgetData as { watch?: WatchMatcher[] } | undefined)?.watch
    : undefined
  useLiveWatch(watch, queryResult.refetch)

  // Live-refresh (per-widget SSE): arm this widget on snowplow's `/refreshes` stream
  // using the coords + key captured from its `/call` response headers. Read during
  // render AFTER the resolving fetch wrote them (the resolved query re-renders us);
  // the entry is undefined until the first cache-keyed response. ON by default.
  const refreshEntry = refreshEnabled ? getRefreshEntry(widgetId) : undefined
  useWidgetLiveRefresh(widgetId, refreshEntry, queryResult.refetch, config?.api.SNOWPLOW_API_BASE_URL, refreshEnabled)

  return {
    queryResult,
    isFetchingResourcesRefs: resourcesRefsFetching > 0,
  }
}
