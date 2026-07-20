import i18n from '../i18n'

/** CR-authored strings opt into localization by prefixing an i18n key: `i18n:some.key`. */
const I18N_PREFIX = 'i18n:'

/**
 * Second-layer widget localization (X2/D23): resolve `i18n:`-prefixed strings in
 * server-driven widget data against the locale catalogs, so CR-authored labels
 * (titles, column headers, button labels…) localize like the app chrome.
 *
 * - Plain strings pass through UNTOUCHED — existing Widget CRs are unaffected.
 * - Unknown keys fall back to the key body (visible + greppable, never blank).
 * - Catalogs are extendable at runtime (`i18next.addResourceBundle`) so installs
 *   can ship their own widget-vocabulary bundles without a rebuild.
 *
 * `resolveWidgetStrings` deep-walks any JSON-shaped value and returns a copy with
 * every `i18n:`-prefixed string resolved; non-string leaves are returned as-is.
 */
export const resolveWidgetString = (value: string): string => {
  if (!value.startsWith(I18N_PREFIX)) {
    return value
  }

  const key = value.slice(I18N_PREFIX.length)
  return i18n.t(key, { defaultValue: key })
}

export const resolveWidgetStrings = <T>(value: T): T => {
  if (typeof value === 'string') {
    return resolveWidgetString(value) as T
  }

  if (Array.isArray(value)) {
    return (value as unknown[]).map((item) => resolveWidgetStrings(item)) as T
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, resolveWidgetStrings(entry)])
    ) as T
  }

  return value
}
