/* eslint-disable sort-keys/sort-keys-fix */
/* this rules conflicts with react-query ordering required for correct type inference */

import { useInfiniteQuery, useIsFetching } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router'

import { useConfigContext } from '../context/ConfigContext'
import type { Widget } from '../types/Widget'
import { getAccessToken } from '../utils/getAccessToken'
import { getUserInfo } from '../utils/getUserInfo'

import type { WatchMatcher } from './liveRefresh'
import { useLiveWatch } from './useLiveRefresh'

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
 * "red cross on initial render". We retry transient failures (network errors,
 * which carry no status, and 5xx) but never permanent ones (4xx: auth /
 * forbidden / not-found / bad-request).
 */
export const shouldRetryWidgetFetch = (failureCount: number, error: unknown): boolean => {
  const status = (error as { status?: number } | null)?.status
  if (typeof status === 'number' && status >= 400 && status < 500) {
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
 * convention's param channel), and the login-provided `displayName` (there is no
 * runtime /me; for the greeting). Returns '' when empty so the param — and the
 * react-query key it feeds — stay stable (same inputs → same string, no spurious refetch).
 */
export const buildExtrasParam = (
  searchParams: URLSearchParams,
  routeParams: Record<string, string | undefined> = {},
  displayName?: string,
): string => {
  const extras: Record<string, unknown> = Object.fromEntries(searchParams.entries())
  for (const [key, value] of Object.entries(routeParams)) {
    if (value !== undefined) { extras[key] = value }
  }
  if (displayName) { extras.displayName = displayName }
  return Object.keys(extras).length > 0 ? JSON.stringify(extras) : ''
}

export const useWidgetQuery = (widgetEndpoint: string) => {
  const { config } = useConfigContext()
  const [searchParams] = useSearchParams()
  const routeParams = useParams()
  // Extras envelope snowplow forwards into the RESTAction jq dict (`?extras=<json>`):
  // route params (e.g. /compositions/:namespace/:name) + browser URL query (search `q`)
  // + login `displayName` (greeting). See buildExtrasParam.
  const extrasParam = buildExtrasParam(searchParams, routeParams, getUserInfo().displayName)

  const widgetFullUrl = `${config!.api.SNOWPLOW_API_BASE_URL}${widgetEndpoint}`
  const requestUrl = new URL(widgetFullUrl)

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

    if (!res.ok) {
      throw new WidgetFetchError(`Widget fetch failed: ${res.status} ${res.statusText}`, res.status)
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

  // Live-refresh: a widget can declare widgetData.watch — refetch this query when a
  // matching k8s event arrives (precise, per-widget throttled by the registry).
  const liveStatus = queryResult.data?.status
  const watch = liveStatus && typeof liveStatus === 'object'
    ? (liveStatus.widgetData as { watch?: WatchMatcher[] } | undefined)?.watch
    : undefined
  useLiveWatch(watch, queryResult.refetch)

  return {
    queryResult,
    isFetchingResourcesRefs: resourcesRefsFetching > 0,
  }
}
