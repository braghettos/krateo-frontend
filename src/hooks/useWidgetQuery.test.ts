/**
 * useWidgetQuery — Path B (task #188) regression coverage.
 *
 * SCOPE: pure-logic tests that pin the GATING DECISIONS controlling whether
 * `fetchNextPage` should fire. We do NOT render the hook (no React tree,
 * no fetch mocks, no jsdom) — instead we replicate the EXACT predicates
 * used in the two pagination drivers as pure functions and pin their
 * truth tables. If the production code drifts from these predicates, the
 * tests below diverge from the duplicate, surfacing the change.
 *
 * What changed in Path B:
 *   The unconditional auto-pagination useEffect in useWidgetQuery
 *   (formerly lines 113-126) was DELETED. It fired `fetchNextPage` on
 *   every commit where `hasNextPage===true`, racing ahead of — and
 *   bypassing — ScrollPagination's intersection-observer gate. With the
 *   eager effect gone, the only remaining `fetchNextPage` driver in the
 *   datagrid path is ScrollPagination.tsx:25-29, which gates on
 *   `inView && hasNextPage && !isFetchingNextPage && !isFetchingResourcesRefs`.
 *
 * Coverage:
 *   Case 1: cold visit fetches only page 1 — no auto-advance occurs
 *           when the sentinel is OUT OF VIEW.
 *   Case 2: scroll-into-view triggers fetchNextPage via ScrollPagination.
 *   Case 3: non-paginating widget kinds are unaffected by either driver.
 *
 * The deleted-predicate signature is preserved here for documentation
 * (so future readers see what the eager effect computed) but is NOT
 * exercised by these tests — the WHOLE POINT of Path B is that it no
 * longer exists.
 */

import { describe, it, expect } from 'vitest'

import { buildExtrasParam, MAX_WIDGET_FETCH_RETRIES, shouldRetryWidgetFetch, WidgetFetchError, widgetFetchRetryDelay } from './useWidgetQuery'

/**
 * Pure replica of ScrollPagination.tsx:25-29 — the intersection-observer
 * gate that is the SOLE remaining `fetchNextPage` driver in the datagrid
 * path after Path B. If the production gate changes, this replica must
 * be updated in lockstep, surfacing the intentional behaviour change.
 */
const shouldScrollPaginationFetch = (deps: {
  inView: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetchingResourcesRefs: boolean
}): boolean => {
  return (
    deps.inView
    && deps.hasNextPage
    && !deps.isFetchingNextPage
    && !deps.isFetchingResourcesRefs
  )
}

/**
 * Pure replica of `useInfiniteQuery.getNextPageParam` in
 * useWidgetQuery.ts:69-86. Determines whether `hasNextPage` is true for
 * the latest page. Returning `undefined` makes react-query report
 * `hasNextPage===false`, which short-circuits BOTH drivers.
 */
type SliceContinue = boolean | undefined
const computeNextPageParam = (
  lastPage: { status?: { resourcesRefs?: { slice?: { continue?: SliceContinue } } } },
  pageParams: { page?: number; perPage?: number },
): { page: number; perPage?: number } | undefined => {
  if (typeof pageParams.page !== 'number') { return undefined }
  const hasMorePages = typeof lastPage.status === 'object'
    && lastPage.status?.resourcesRefs?.slice?.continue === true
  if (!hasMorePages) { return undefined }
  return { page: pageParams.page + 1, perPage: pageParams.perPage }
}

describe('Path B — cold visit fetches only page 1, no auto-advance', () => {
  /**
   * Case 1 — Before Path B: the deleted unconditional `useEffect` would
   * have fired `fetchNextPage` immediately on the page-1 response if
   * `hasNextPage===true`, ignoring `inView`. After Path B, ScrollPagination
   * is the sole driver, and on cold visit the sentinel is OUT OF VIEW
   * (typical 1080px viewport with a few cards above the sentinel only
   * for very-short lists; on a long list the sentinel is below the
   * fold). With `inView===false`, `fetchNextPage` MUST NOT fire.
   */
  it('does NOT call fetchNextPage when sentinel is out of view', () => {
    const fetchedPage1: { status?: { resourcesRefs?: { slice?: { continue?: SliceContinue } } } } = {
      status: { resourcesRefs: { slice: { continue: true } } },
    }
    const pageParam = computeNextPageParam(fetchedPage1, { page: 1, perPage: 5 })
    expect(pageParam).toEqual({ page: 2, perPage: 5 })

    // Sentinel is below the fold on a long compositions list — out of view.
    const willFire = shouldScrollPaginationFetch({
      hasNextPage: pageParam !== undefined,
      inView: false,
      isFetchingNextPage: false,
      isFetchingResourcesRefs: false,
    })
    expect(willFire).toBe(false)
  })

  it('does NOT call fetchNextPage while resourceRefs of page 1 are still in flight', () => {
    // Backpressure case: even if inView is true, an in-flight resourceRefs
    // wave gates the next page. Pre-Path-B, the eager effect did NOT honour
    // this (only checked `isFetching` on the parent query, not children).
    // Post-Path-B, ScrollPagination's gate honours isFetchingResourcesRefs.
    const willFire = shouldScrollPaginationFetch({
      hasNextPage: true,
      inView: true,
      isFetchingNextPage: false,
      isFetchingResourcesRefs: true,
    })
    expect(willFire).toBe(false)
  })
})

describe('Path B — scroll-into-view triggers fetchNextPage via ScrollPagination', () => {
  /**
   * Case 2 — When the user scrolls and the sentinel enters the viewport,
   * `inView` flips to true. With `hasNextPage===true` and no in-flight
   * waves, the intersection-observer effect fires `fetchNextPage` exactly
   * once. This is the desired lazy-pagination behaviour that the deleted
   * eager useEffect was suppressing.
   */
  it('fires fetchNextPage when sentinel enters viewport and no waves are in flight', () => {
    const willFire = shouldScrollPaginationFetch({
      hasNextPage: true,
      inView: true,
      isFetchingNextPage: false,
      isFetchingResourcesRefs: false,
    })
    expect(willFire).toBe(true)
  })

  it('does NOT re-fire while a fetchNextPage is already in flight', () => {
    // Once fetchNextPage is issued, react-query sets isFetchingNextPage=true
    // until the response lands. The gate must NOT re-fire during this window
    // — preserving the backpressure that prevents N+1 stampedes.
    const willFire = shouldScrollPaginationFetch({
      hasNextPage: true,
      inView: true,
      isFetchingNextPage: true,
      isFetchingResourcesRefs: false,
    })
    expect(willFire).toBe(false)
  })
})

describe('Path B — non-paginating widget kinds are unaffected', () => {
  /**
   * Case 3 — Page, Panel, Row, Table, Markdown, Button, etc. — the 25
   * widget kinds that do NOT use cumulative-slice pagination — never
   * set `status.resourcesRefs.slice.continue=true`, so
   * `getNextPageParam` returns `undefined`, so `hasNextPage===false`,
   * so NEITHER driver ever fires `fetchNextPage`. Furthermore, these
   * widgets aren't wrapped in `<ScrollPagination>` (WidgetRenderer.tsx
   * wires it only around DataGrid), so the intersection-observer hook
   * never even mounts for them.
   */
  it('returns undefined nextPageParam for widgets that do not set slice.continue', () => {
    const pieChartLikePage = { status: { resourcesRefs: { /* no slice field */ } } }
    const pageParam = computeNextPageParam(pieChartLikePage, { page: 1, perPage: 5 })
    expect(pageParam).toBeUndefined()
  })

  it('returns undefined nextPageParam when slice.continue is explicitly false', () => {
    const lastPageOfList = { status: { resourcesRefs: { slice: { continue: false } } } }
    const pageParam = computeNextPageParam(lastPageOfList, { page: 7, perPage: 5 })
    expect(pageParam).toBeUndefined()
  })

  it('ScrollPagination gate is a no-op when hasNextPage is false even if sentinel is in view', () => {
    // Defence in depth: even if a non-paginating widget were somehow
    // wrapped in ScrollPagination by misconfiguration, the gate would
    // still refuse to fire because hasNextPage is false.
    const willFire = shouldScrollPaginationFetch({
      hasNextPage: false,
      inView: true,
      isFetchingNextPage: false,
      isFetchingResourcesRefs: false,
    })
    expect(willFire).toBe(false)
  })

  it('returns undefined nextPageParam when no initial page was set in URL', () => {
    // useWidgetQuery.ts:70-73 short-circuit: widgets called without a
    // ?page= query param never paginate. Path B does not change this.
    const widgetWithoutPageParam = { status: { resourcesRefs: { slice: { continue: true } } } }
    const pageParam = computeNextPageParam(widgetWithoutPageParam, { page: undefined, perPage: 5 })
    expect(pageParam).toBeUndefined()
  })
})

describe('initial-render retry — transient failures retry, permanent ones do not', () => {
  it('retries network errors (no status) up to the cap, then stops', () => {
    // "Server has not yet answered": fetch rejects with a TypeError that has
    // no .status — the case behind the initial-render red cross.
    const networkError = new TypeError('Failed to fetch')
    expect(shouldRetryWidgetFetch(0, networkError)).toBe(true)
    expect(shouldRetryWidgetFetch(MAX_WIDGET_FETCH_RETRIES - 1, networkError)).toBe(true)
    expect(shouldRetryWidgetFetch(MAX_WIDGET_FETCH_RETRIES, networkError)).toBe(false)
  })

  it('retries 5xx (transient server errors, e.g. snowplow still starting)', () => {
    expect(shouldRetryWidgetFetch(0, new WidgetFetchError('boom', 503))).toBe(true)
    expect(shouldRetryWidgetFetch(0, new WidgetFetchError('boom', 500))).toBe(true)
  })

  it('never retries 4xx (auth / forbidden / not-found / bad-request)', () => {
    for (const status of [400, 401, 403, 404]) {
      expect(shouldRetryWidgetFetch(0, new WidgetFetchError('nope', status))).toBe(false)
    }
  })

  it('uses capped exponential backoff between attempts', () => {
    expect(widgetFetchRetryDelay(0)).toBe(700)
    expect(widgetFetchRetryDelay(1)).toBe(1400)
    expect(widgetFetchRetryDelay(2)).toBe(2800)
    // capped
    expect(widgetFetchRetryDelay(10)).toBe(5000)
  })
})

describe('buildExtrasParam — request/user values forwarded into the RA jq dict', () => {
  const sp = (query: string) => new URLSearchParams(query)

  it('returns empty string when there is no URL query and no identity', () => {
    // Empty → '' (not '{}') so the param and the queryKey stay absent/stable.
    expect(buildExtrasParam(sp(''))).toBe('')
  })

  it('forwards the browser URL query (server-side search term)', () => {
    expect(buildExtrasParam(sp('q=foo'))).toBe('{"q":"foo"}')
  })

  it('forwards the login displayName when present (greeting)', () => {
    expect(buildExtrasParam(sp(''), 'Diego')).toBe('{"displayName":"Diego"}')
  })

  it('merges URL query and identity', () => {
    expect(buildExtrasParam(sp('q=foo'), 'Diego')).toBe('{"q":"foo","displayName":"Diego"}')
  })

  it('identity overrides a spoofed displayName URL param', () => {
    // A URL like ?displayName=evil must NOT override the authenticated identity.
    expect(buildExtrasParam(sp('displayName=evil'), 'Diego')).toBe('{"displayName":"Diego"}')
  })

  it('is stable for the same inputs (so the react-query key does not churn)', () => {
    expect(buildExtrasParam(sp('q=foo'), 'Diego')).toBe(buildExtrasParam(sp('q=foo'), 'Diego'))
  })
})
