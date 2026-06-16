import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useConfigContext } from '../context/ConfigContext'
import { createRoute, useRoutesContext } from '../context/RoutesContext'
import { buildRouteSpecs, extractLoaderItemPaths } from '../context/routesModel'
import type { Widget } from '../types/Widget'
import { getAccessToken } from '../utils/getAccessToken'

import { shouldRetryWidgetFetch, WidgetFetchError, widgetFetchRetryDelay } from './useWidgetQuery'

const fetchWidget = async (url: string, token: string): Promise<Widget> => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) {
    throw new WidgetFetchError(`Routes fetch failed: ${res.status} ${res.statusText}`, res.status)
  }
  return (await res.json()) as Widget
}

/**
 * Loads the full app route set as DATA: fetch the RoutesLoader, then each Route
 * CR it references (cluster-wide, via snowplow's `all-routes` RESTAction), then
 * register them with the router. Replaces the legacy mechanism where the Menu
 * mounted a `RoutesLoader` widget that mounted N invisible `Route` widgets, each
 * self-registering via its own `useEffect`.
 *
 * Mounted from `WidgetPage` (the authenticated shell) on purpose: `RoutesProvider`
 * sits ABOVE the login gate, so fetching there would fire before a token exists
 * and 401 (and `getAccessToken()` throws). Gating on the stored token + only
 * running inside the authenticated area preserves the original post-auth timing
 * while decoupling route-loading from the sidebar Menu rendering.
 */
export const useLoadRoutes = () => {
  const { config } = useConfigContext()
  const { registerRoutes } = useRoutesContext()

  const base = config?.api.SNOWPLOW_API_BASE_URL
  const routesLoaderEndpoint = config?.api.ROUTES_LOADER
  // getAccessToken() throws when unauthenticated, so gate on the raw token presence.
  const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('K_user')

  const { data: routeSpecs } = useQuery({
    enabled: !!base && !!routesLoaderEndpoint && hasToken,
    queryFn: async () => {
      const token = getAccessToken()
      const loader = await fetchWidget(`${base}${routesLoaderEndpoint}`, token)
      const routeWidgets = await Promise.all(
        extractLoaderItemPaths(loader).map((path) => fetchWidget(`${base}${path}`, token))
      )
      return buildRouteSpecs(routeWidgets)
    },
    // queryKey[1] contains 'resource=routesloaders' (⊇ 'resource=routes'), so
    // RoutesContext.reloadRoutes()'s invalidation predicate refetches this.
    queryKey: ['widgets', routesLoaderEndpoint, base],
    retry: shouldRetryWidgetFetch,
    retryDelay: widgetFetchRetryDelay,
  })

  useEffect(() => {
    if (routeSpecs && routeSpecs.length > 0) {
      registerRoutes(routeSpecs.map(({ endpoint, path }) => createRoute({ endpoint, path })))
    }
  }, [routeSpecs, registerRoutes])
}
