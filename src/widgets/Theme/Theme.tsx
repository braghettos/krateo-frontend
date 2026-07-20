import { useEffect } from 'react'

import { useThemeMode } from '../../context/ThemeModeContext'
import type { WidgetProps } from '../../types/Widget'

import type { Theme as WidgetType } from './Theme.type'

export type ThemeWidgetData = WidgetType['spec']['widgetData']

/**
 * Tenant Theme (Brand v2, issue #49 §7). A SIDE-EFFECT widget: it renders no visible UI, it
 * applies tenant brand overrides by setting CSS custom properties on `:root`. Mount ONE globally
 * (e.g. in the app-shell) so the overrides apply app-wide.
 *
 * Mechanism: `cssVariables(mode)` (ThemeModeContext) emits the default `--krateo-*` + legacy
 * `--*-color` tokens on every render / mode toggle. This widget's effect runs AFTER that (commit
 * phase) and overrides a SUBSET via `documentElement.style.setProperty` — inline styles win the
 * cascade — and re-runs whenever the mode or the tenant values change, so a toggle re-applies the
 * override on top of the freshly-emitted defaults. Only Tier-1 tokens are overridable; Tier-2
 * (status / agent Signal Yellow / focus ring / chart palette) is not in the schema, so it is locked.
 */
const Theme = ({ widgetData }: WidgetProps<ThemeWidgetData>) => {
  const { mode, setMode } = useThemeMode()
  const { custom, mode: pinnedMode, token } = widgetData ?? {}

  // Pin the color mode if the tenant declares one (overrides the user's toggle preference).
  useEffect(() => {
    if (pinnedMode && pinnedMode !== mode) { setMode(pinnedMode) }
  }, [pinnedMode, mode, setMode])

  // Apply the token/custom overrides after the default vars are emitted. Depends on `mode` so a
  // light/dark toggle (which re-emits defaults) re-applies the tenant override on top.
  useEffect(() => {
    const root = document.documentElement
    const set = (name: string, value?: string | number) => {
      if (value !== undefined && value !== null && value !== '') {
        root.style.setProperty(name, typeof value === 'number' ? `${value}px` : value)
      }
    }

    // Tier-1 tokens → legacy --*-color aliases AND the canonical --krateo-* tokens.
    if (token) {
      set('--primary-color', token.colorPrimary); set('--krateo-color-action-primary', token.colorPrimary)
      set('--background-color', token.colorBgLayout); set('--krateo-color-background-base', token.colorBgLayout)
      set('--panelbg-color', token.colorBgContainer); set('--krateo-color-background-surface', token.colorBgContainer)
      set('--border-color', token.colorBorder); set('--krateo-color-border-subtle', token.colorBorder)
      set('--text-color', token.colorText); set('--krateo-color-text-default', token.colorText)
      set('--font-family', token.fontFamily); set('--krateo-font-ui', token.fontFamily)
      set('--krateo-text-body', token.fontSize)
    }

    // Non-token chrome: sidebar rail gradient + nav-item colours.
    // Precedence (issue #52, per the maintainer's clarification): the DEFAULT rail equals
    // colorBgContainer (blends with the app surface — emitted by cssVariables). Here:
    //  1. an explicit custom.sidebar wins;
    //  2. else if the tenant overrode token.colorBgContainer, the rail tracks THAT (it equals the
    //     surface by design), so the rail stays in sync with the tenant's surface;
    //  3. else leave the emitted default. colorPrimary does NOT drive the rail — a tenant who wants
    //     that sets custom.sidebar explicitly (navGradientFrom is exported to compute such a value).
    // NB the LOGIN panel's --menubgstart/end-color (Sovereign gradient) is intentionally not touched.
    if (custom?.sidebar) {
      set('--krateo-nav-gradient-start', custom.sidebar.bgGradientStart)
      set('--krateo-nav-gradient-end', custom.sidebar.bgGradientEnd)
    } else if (token?.colorBgContainer) {
      set('--krateo-nav-gradient-start', token.colorBgContainer)
      set('--krateo-nav-gradient-end', token.colorBgContainer)
    }
    if (custom?.menu) {
      set('--menuitem-color', custom.menu.itemColor); set('--krateo-nav-item', custom.menu.itemColor)
      set('--menuitembg-color', custom.menu.itemSelectedBg)
      set('--krateo-nav-item-active', custom.menu.itemSelectedColor)
    }
  }, [mode, token, custom])

  return null
}

export default Theme
