import { useIsFetching } from '@tanstack/react-query'
import { useLocation } from 'react-router'

import { useRoutesContext } from '../../context/RoutesContext'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import Page404 from '../../pages/Page404'
import PageSearch from '../PageSearch'
import WidgetRenderer from '../WidgetRenderer'

/** Exact routes that get a frontend-rendered page search bar (→ `?q=` → the page's
 * data-source RESTAction name/description filter). Frontend chrome, like the Shell search. */
const PAGE_SEARCH: Record<string, string> = {
  '/blueprints': 'Search blueprints by name or description…',
  '/compositions': 'Search compositions by name…',
  '/marketplace': 'Search the catalog by name or description…',
}

/**
 * Content-only routed page: resolves which widget endpoint the current route
 * should render and hands it to WidgetRenderer. The shell chrome (the Layout
 * widget, nav, header, overlays, auth gate and route loading) lives in the Shell
 * layout route — this renders into the Layout widget's content region via its
 * <Outlet/>, so only the content swaps as routes change.
 */
export const WidgetPage = ({ defaultWidgetEndpoint }: { defaultWidgetEndpoint?: string }) => {
  const location = useLocation()
  const { menuRoutes } = useRoutesContext()
  const currentRoute = menuRoutes.find(({ path }) => path === location.pathname)
  // Route-driven browser-tab title (relocated off the Page widget's <title>).
  useDocumentTitle(currentRoute?.title)
  // Content resolves ONLY from the route (routes-as-data → snowplow). The legacy
  // `?widgetEndpoint=` query-param override is intentionally not supported.
  const widgetEndpoint = currentRoute?.resourceRef?.path || defaultWidgetEndpoint || ''

  // Routes now come from the sidebar Menu's inline items (registered once the INIT
  // Layout → Menu resolves), so "routes still loading" = that fetch is in flight —
  // show loading, not 404, until the route source has registered.
  const isFetchingRoutes = useIsFetching({
    predicate: (query) => {
      const key = query.queryKey[1] as string
      return key.includes('resource=layouts') || key.includes('resource=menus')
    },
  })

  if (!widgetEndpoint && !isFetchingRoutes) {
    return <Page404 />
  }
  const searchPlaceholder = PAGE_SEARCH[location.pathname]
  return (
    <>
      {searchPlaceholder ? <PageSearch placeholder={searchPlaceholder} /> : null}
      <WidgetRenderer key='content' widgetEndpoint={widgetEndpoint} />
    </>
  )
}

export default WidgetPage
