import type { AppRoute } from '../../context/RoutesContext'
import type { ResourcesRefs } from '../../types/Widget'
import { getResourceEndpoint, getResourceRef } from '../../utils/utils'

/** A folded nav entry on `Menu.widgetData.items` (inline nav data). */
export interface InlineNavItem {
  resourceRefId?: string
  icon?: string
  label?: string
  path?: string
  order?: number
  /** Convention page-slug override (required for templated paths to avoid
   * list-vs-detail collisions); else derived from `path`. */
  page?: string
}

/** Antd Menu entry data (icon resolved to JSX by the component). */
export interface NavEntry {
  iconName?: string
  key: string
  label: string
}

const PAGE_RESOURCE = 'flexes'
const PAGE_API_VERSION = 'widgets.templates.krateo.io/v1beta1'

/** Convention slug for a route path: drop `{param}` segments + leading '/', '/'→'-'. */
const routeSlug = (path: string): string =>
  path.replace(/\/?\{[^}]+\}/g, '').replace(/^\//, '').replace(/\//g, '-') || 'home'

/**
 * Resolve a nav item's content endpoint, by precedence:
 *  1. `resourceRefId` → the Menu's own `resourcesRefs` (structured + RBAC-resolved
 *     by snowplow; the existing nav form);
 *  2. convention — a `flexes/page-<slug>` widget derived from `path` (`page:`
 *     overrides the slug; required for templated paths to avoid list-vs-detail collisions).
 * Both avoid hardcoding a raw /call URL (no `endpoint` escape hatch).
 */
export const resolveContentEndpoint = (
  item: InlineNavItem,
  resourcesRefs: ResourcesRefs,
  namespace: string,
): string => {
  if (item.resourceRefId) {
    const ref = resourcesRefs?.items?.find(({ id }) => id === item.resourceRefId)
    if (ref?.path) { return ref.path }
  }
  const slug = item.page ?? routeSlug(item.path ?? '')
  return getResourceEndpoint({ apiVersion: PAGE_API_VERSION, name: `page-${slug}`, namespace, resource: PAGE_RESOURCE })
}

/**
 * Frontend-only cosmetic hide: nav paths whose visible sidebar ENTRY is suppressed (the
 * route still resolves if reached directly by URL). The canonical source is the `sidebar-nav`
 * Menu CR served by snowplow; this is a temporary client-side override so we don't touch the
 * cluster — delete a path here to restore its sidebar item.
 */
const HIDDEN_NAV_PATHS = new Set<string>(['/observability'])

/**
 * Build the antd-Menu entries + app routes from inline nav items.
 * - ROUTES: every item with a `path` (label OPTIONAL → a label-less item is a
 *   route-only/hidden route, e.g. /search, detail, create). Content endpoint via
 *   `resolveContentEndpoint` (explicit → resourceRefId → convention `flexes/page-<slug>`),
 *   so the INIT nav is the single, param-capable route source — no routes-loader.
 * - ENTRIES: only items with a `label` (the visible sidebar). Both sorted by `order`.
 */
export const buildNavModel = (
  items: readonly InlineNavItem[],
  resourcesRefs: ResourcesRefs,
  namespace: string = '',
): { entries: NavEntry[]; routes: AppRoute[] } => {
  const sorted = [...items].sort((left, right) => (left.order ?? 100) - (right.order ?? 100))

  const routes: AppRoute[] = sorted
    .filter((item): item is InlineNavItem & { path: string } => !!item.path)
    .map((item) => ({
      endpoint: resolveContentEndpoint(item, resourcesRefs, namespace),
      path: item.path,
      resourceRef: item.resourceRefId ? getResourceRef(item.resourceRefId, resourcesRefs) : undefined,
      resourceRefId: item.resourceRefId ?? '',
      title: item.label,
    }))

  const entries: NavEntry[] = sorted
    .filter((item): item is InlineNavItem & { label: string; path: string } => !!item.label && !!item.path && !HIDDEN_NAV_PATHS.has(item.path))
    .map((item) => ({ iconName: item.icon, key: item.path, label: item.label }))

  return { entries, routes }
}
