import type { Widget } from '../types/Widget'
import { getEndpointUrl } from '../utils/utils'

/** A route to register: the react-router path (possibly templated) + the snowplow content endpoint. */
export interface RouteSpec {
  endpoint: string
  path: string
}

/** Resolved widgetData of a Route CR — snowplow returns it under `status.widgetData`. */
interface RouteWidgetData {
  path?: string
  resourceRefId?: string
}

/** snowplow may return `status` as a string (error / plain); only object status carries resolved data. */
const objectStatus = (widget: Widget | undefined) => (
  widget && typeof widget.status === 'object' ? widget.status : undefined
)

/**
 * The Route CR endpoints discovered by the RoutesLoader. snowplow resolves the
 * loader's cluster-wide `all-routes` RESTAction into `status.resourcesRefs.items`
 * — one entry per Route CR in the cluster — and each item's `path` is a snowplow
 * `/call?...` endpoint for that Route CR.
 */
export const extractLoaderItemPaths = (loader: Widget | undefined): string[] =>
  objectStatus(loader)?.resourcesRefs?.items?.map((item) => item.path).filter((path): path is string => !!path) ?? []

/**
 * Build the route specs from the resolved Route widgets. This mirrors exactly
 * what the old `Route` widget did per CR
 * (`getEndpointUrl(resourceRefId, resourcesRefs)` → `createRoute({ endpoint, path })`),
 * but assembles the FULL route set as pure data in one place instead of via N
 * self-registering invisible widgets. Walking the same RoutesLoader→Route chain
 * keeps the route set identical by construction — including dynamic/detail routes
 * (e.g. `/compositions/{ns}/{name}`) that are NOT menu entries. Routes missing a
 * path / resourceRefId / resolvable endpoint are skipped.
 */
export const buildRouteSpecs = (routeWidgets: Array<Widget | undefined>): RouteSpec[] =>
  routeWidgets.flatMap((widget) => {
    const status = objectStatus(widget)
    const widgetData = status?.widgetData as RouteWidgetData | undefined
    const path = widgetData?.path
    const resourceRefId = widgetData?.resourceRefId
    const resourcesRefs = status?.resourcesRefs

    if (!path || !resourceRefId || !resourcesRefs) {
      return []
    }

    const endpoint = getEndpointUrl(resourceRefId, resourcesRefs)
    return endpoint ? [{ endpoint, path }] : []
  })
