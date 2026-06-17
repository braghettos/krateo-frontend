import { formatISODate, formatRelativeTime } from '../../utils/utils'

/**
 * Generic item → row mapping for the List/Feed widget. This is the seam that
 * lets a *list of anything* render as rows, instead of a domain-locked widget:
 * each row slot is a template string with `{dot.path}` placeholders resolved
 * against the item. `{a|b|c}` picks the first non-empty path (fallbacks).
 */

export type RowSlot = 'primaryText' | 'secondaryText' | 'subPrimaryText' | 'subSecondaryText'

/**
 * A per-row action menu entry (kebab `⋯`). `actionId` references an action defined in
 * the List's `widgetData.actions` (the canonical action map); firing it passes the row's
 * data as the action payload, so one shared action definition serves every row.
 */
export interface RowAction {
  actionId: string
  label: string
  /** Optional Font Awesome icon name for the menu item. */
  icon?: string
  /** Render the menu item in a destructive (red) style. */
  danger?: boolean
}

export interface ColorSpec {
  /** Literal palette color, or a `{path}` resolved against the item. */
  value?: string
  /** Map a resolved value to a palette color (e.g. { Normal: 'blue', Warning: 'orange' }). */
  map?: Record<string, string>
  default?: string
}

export interface ItemTemplate {
  primaryText?: string
  secondaryText?: string
  subPrimaryText?: string
  subSecondaryText?: string
  /** Icon name (font awesome), or a `{path}`. */
  icon?: string
  /**
   * How the leading indicator is presented:
   * - `avatar` (default): solid colored disc + white glyph;
   * - `tile`: soft-tint rounded square + colored glyph (catalog/list rows);
   * - `dot`: small solid status dot with a soft halo, no glyph (event/status feeds).
   */
  iconVariant?: 'avatar' | 'tile' | 'dot'
  color?: ColorSpec
  /** Per-slot value formatting; `datetime` → absolute date+time, `relative` → "3h ago". */
  formats?: Partial<Record<RowSlot, 'text' | 'datetime' | 'relative'>>
  /** Render `secondaryText` as a soft-tint Tag pill (e.g. a category) rather than plain text. */
  secondaryTextAsTag?: boolean
  /**
   * Per-item navigation target — a `{path}` template resolved against the item
   * (e.g. `{link}` or `/compositions/{metadata.namespace}/{metadata.name}`). When it
   * resolves non-empty the row becomes clickable and navigates there (SPA route).
   * The per-row action slice of the action envelope — drives clickable catalogs
   * (Marketplace tiles → create route) and search results.
   */
  navigateTo?: string
  /**
   * Per-row action menu (kebab `⋯`): side-effectful actions for the row, each referencing
   * an action id in the List's `widgetData.actions`, fired with the row as payload. Static
   * descriptors (same menu on every row); the row's data flows in at click time. Distinct
   * from `navigateTo`, which is the whole-row click.
   */
  rowActions?: RowAction[]
}

export interface ResolvedRow {
  primaryText: string
  secondaryText: string
  subPrimaryText: string
  subSecondaryText: string
  icon: string
  color: string
  /** Resolved navigation target (empty string when the row is not clickable). */
  navigateTo: string
}

export const resolvePath = (item: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), item)

/** Replace `{path}` / `{a|b|c}` placeholders with the first non-empty resolved value. Literal text is kept. */
export const interpolate = (template: string | undefined, item: unknown): string => {
  if (!template) { return '' }
  return template.replace(/\{([^}]+)\}/g, (_match, expression: string) => {
    for (const path of expression.split('|')) {
      const value = resolvePath(item, path.trim())
      if (value !== undefined && value !== null && value !== '') {
        return typeof value === 'object' ? JSON.stringify(value) : String(value as string | number | boolean)
      }
    }
    return ''
  })
}

export const resolveColor = (spec: ColorSpec | undefined, item: unknown): string => {
  if (!spec) { return 'gray' }
  const resolved = interpolate(spec.value, item)
  if (spec.map) { return spec.map[resolved] ?? spec.default ?? 'gray' }
  return resolved || spec.default || 'gray'
}

const resolveSlot = (template: ItemTemplate, slot: RowSlot, item: unknown): string => {
  const text = interpolate(template[slot], item)
  if (!text) { return text }
  const format = template.formats?.[slot]
  if (format === 'datetime') { return formatISODate(text, true) }
  if (format === 'relative') { return formatRelativeTime(text) }
  return text
}

export const resolveRow = (template: ItemTemplate, item: unknown): ResolvedRow => ({
  color: resolveColor(template.color, item),
  icon: interpolate(template.icon, item),
  navigateTo: interpolate(template.navigateTo, item),
  primaryText: resolveSlot(template, 'primaryText', item),
  secondaryText: resolveSlot(template, 'secondaryText', item),
  subPrimaryText: resolveSlot(template, 'subPrimaryText', item),
  subSecondaryText: resolveSlot(template, 'subSecondaryText', item),
})
