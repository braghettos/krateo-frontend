import { ConfigProvider } from 'antd'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { cssVariables, getAntdTheme, type ThemeMode, type ThemeOverride } from '../theme/tokens'

const STORAGE_KEY = 'krateo-theme-mode'

const getInitialMode = (): ThemeMode => {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface ThemeModeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  /** Apply (or clear, with `undefined`) the runtime per-tenant theme override from
   * `config.json` (S8/D20). Set once by the config bridge after the runtime config loads;
   * both the antd theme and the `:root` CSS variables re-derive from it. */
  setThemeOverride: (override: ThemeOverride | undefined) => void
  toggle: () => void
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined)

export const useThemeMode = (): ThemeModeContextValue => {
  const context = useContext(ThemeModeContext)
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeModeProvider')
  }

  return context
}

/**
 * Owns the active color mode (light/dark), the antd `ConfigProvider` theme, and
 * the `:root` CSS custom properties consumed by `*.module.css`. The mode is
 * seeded from localStorage, falling back to the OS `prefers-color-scheme`, and
 * persisted on change. CSS variables + the `data-theme` attribute are applied
 * synchronously during render so there is no flash on first paint or on toggle.
 */
export const ThemeModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(getInitialMode)
  // Runtime per-tenant theme override (S8/D20): starts empty (built-in tokens = the
  // fallback), populated by the config bridge once `config.json` is fetched. `undefined`
  // keeps the pre-override render byte-identical, so first paint never flashes off-brand.
  const [themeOverride, setThemeOverride] = useState<ThemeOverride | undefined>(undefined)

  // Apply synchronously (matches the prior cssVariables()-in-render pattern) so
  // the variables/attribute are set before children read them — no FOUC.
  cssVariables(mode, themeOverride)
  document.documentElement.dataset.theme = mode

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const value: ThemeModeContextValue = {
    mode,
    setMode,
    setThemeOverride,
    toggle: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')),
  }

  // Stable antd theme identity per (mode, override) so antd doesn't recompute styles
  // on unrelated provider re-renders.
  const antdTheme = useMemo(() => getAntdTheme(mode, themeOverride), [mode, themeOverride])

  return (
    <ThemeModeContext.Provider value={value}>
      <ConfigProvider theme={antdTheme}>
        {children}
      </ConfigProvider>
    </ThemeModeContext.Provider>
  )
}
