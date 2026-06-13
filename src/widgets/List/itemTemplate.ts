import { formatISODate } from '../../utils/utils'

/**
 * Generic item → row mapping for the List/Feed widget. This is the seam that
 * lets a *list of anything* render as rows, instead of a domain-locked widget:
 * each row slot is a template string with `{dot.path}` placeholders resolved
 * against the item. `{a|b|c}` picks the first non-empty path (fallbacks).
 */

export type RowSlot = 'primaryText' | 'secondaryText' | 'subPrimaryText' | 'subSecondaryText'

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
  color?: ColorSpec
  /** Per-slot value formatting; `datetime` runs the resolved value through formatISODate. */
  formats?: Partial<Record<RowSlot, 'text' | 'datetime'>>
}

export interface ResolvedRow {
  primaryText: string
  secondaryText: string
  subPrimaryText: string
  subSecondaryText: string
  icon: string
  color: string
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
  return template.formats?.[slot] === 'datetime' && text ? formatISODate(text, true) : text
}

export const resolveRow = (template: ItemTemplate, item: unknown): ResolvedRow => ({
  color: resolveColor(template.color, item),
  icon: interpolate(template.icon, item),
  primaryText: resolveSlot(template, 'primaryText', item),
  secondaryText: resolveSlot(template, 'secondaryText', item),
  subPrimaryText: resolveSlot(template, 'subPrimaryText', item),
  subSecondaryText: resolveSlot(template, 'subSecondaryText', item),
})
