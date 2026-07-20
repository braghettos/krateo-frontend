import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import it from './locales/it.json'

/**
 * App-chrome internationalization (X2/D23), wired with react-i18next.
 *
 * Scope: the ENGINE-owned chrome strings (header controls, user menu, widget
 * states…). Server-driven widget CONTENT stays authored in the Widget CRs — its
 * second-layer localization is the `i18n:` key convention resolved by
 * `resolveWidgetStrings` (src/utils/i18n-widget.ts) against these same catalogs
 * (extendable at runtime via `i18next.addResourceBundle`).
 *
 * Locale resolution order (first hit wins):
 *   1. explicit user choice, persisted in localStorage (`krateo-locale`) — the
 *      hook point for the per-user preference ConfigMap (D10) later;
 *   2. the Org/install default from runtime `config.json` (`i18n.defaultLocale`),
 *      applied post-config-fetch by `applyOrgDefaultLocale`;
 *   3. the browser language;
 *   4. English.
 */

export const LOCALE_STORAGE_KEY = 'krateo-locale'

export const SUPPORTED_LOCALES = ['en', 'it'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const isSupported = (value: string | null | undefined): value is SupportedLocale =>
  !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value)

/** localStorage guarded for non-browser runtimes (vitest node environment). */
const getStoredLocale = (): string | null =>
  (typeof localStorage === 'undefined' ? null : localStorage.getItem(LOCALE_STORAGE_KEY))

const getInitialLocale = (): SupportedLocale => {
  const stored = getStoredLocale()
  if (isSupported(stored)) {
    return stored
  }

  const browser = typeof navigator === 'undefined' ? undefined : navigator.language?.slice(0, 2).toLowerCase()
  return isSupported(browser) ? browser : 'en'
}

void i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  // React already escapes interpolated values.
  interpolation: { escapeValue: false },
  lng: getInitialLocale(),
  resources: {
    en: { translation: en },
    it: { translation: it },
  },
  returnEmptyString: false,
})

/** Switch locale from an explicit user action and persist the choice (it then wins
 * over the Org default on every future load). */
export const setLocale = (locale: SupportedLocale): void => {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  void i18n.changeLanguage(locale)
}

/** Apply the Org/install default locale from runtime config — only when the user has
 * never made an explicit choice (stored preference always wins). No-op for unknown
 * or absent locales. */
export const applyOrgDefaultLocale = (locale: string | undefined): void => {
  if (!isSupported(locale) || isSupported(getStoredLocale())) {
    return
  }

  if (i18n.language !== locale) {
    void i18n.changeLanguage(locale)
  }
}

export default i18n
