import type { AppRoute } from '../../context/RoutesContext'
import type { ResourcesRefs } from '../../types/Widget'
import { getResourceRef } from '../../utils/utils'

/** A folded nav entry on `Menu.widgetData.items` (the inline NavMenuItem form). */
export interface InlineNavItem {
  resourceRefId: string
  icon?: string
  label?: string
  path?: string
  order?: number
}

/** Antd Menu entry data (icon resolved to JSX by the component). */
export interface NavEntry {
  iconName?: string
  key: string
  label: string
}

/**
 * True when the menu carries folded (inline) nav data — at least one item has a
 * `label` and `path`. Otherwise items are NavMenuItem CR references (back-compat),
 * resolved by fetching those CRs.
 */
export const hasInlineNav = (items: readonly InlineNavItem[] | undefined): boolean =>
  !!items?.some((item) => typeof item.label === 'string' && typeof item.path === 'string')

/**
 * Build the antd-Menu entries + app routes from inline nav items. Each item's
 * content endpoint is resolved from the Menu's own `resourcesRefs` by
 * `resourceRefId`. Items missing `path`/`label` are skipped; entries are sorted
 * by `order` (default 100).
 */
export const buildNavModel = (
  items: readonly InlineNavItem[],
  resourcesRefs: ResourcesRefs
): { entries: NavEntry[]; routes: AppRoute[] } => {
  const usable = items
    .filter((item): item is InlineNavItem & { label: string; path: string } => !!item.label && !!item.path)
    .sort((left, right) => (left.order ?? 100) - (right.order ?? 100))

  const entries: NavEntry[] = usable.map((item) => ({ iconName: item.icon, key: item.path, label: item.label }))

  const routes: AppRoute[] = usable.map((item) => ({
    path: item.path,
    resourceRef: getResourceRef(item.resourceRefId, resourcesRefs),
    resourceRefId: item.resourceRefId,
    title: item.label,
  }))

  return { entries, routes }
}
