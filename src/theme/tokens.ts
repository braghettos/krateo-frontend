/* eslint-disable sort-keys/sort-keys-fix */
// Token scales are ordered semantically (xs → xl, token before components), not alphabetically.
import { theme as antdAlgorithms, type ThemeConfig } from 'antd'

/**
 * Single source of truth for the design system. Everything else derives from
 * here: the antd `ThemeConfig` (`lightTheme` / `darkTheme`) and the `:root` CSS
 * custom properties (`cssVariables`) consumed by `*.module.css`.
 *
 * BRAND = "Krateo Brand Identity v2" (blue) — braghettos/krateo-frontend issue #49.
 * Interaction blue: Krateo Blue #11B2E2 (dark primary #2FBFE6) / Sovereign Blue #05629A
 * (light primary + nav surface). Status is a Tier-2-locked semantic set: green #00D690,
 * amber #FFAA00, red #F84C4C, info blue. Signal Yellow #E8FF00 is RESERVED for the
 * "Autopilot/AI agent is EXECUTING" state ONLY (never a CTA/decoration/link). The sidebar is
 * ALWAYS the Sovereign gradient #005D8B→#002F46 in both modes; the focus ring is #2FBFE6
 * (dark) / #05629A (light). Values retargeted onto the fork's runtime emitter (this file →
 * `cssVariables` + antd bridge); the `--krateo-*` CSS-var RENAME is a separate follow-up (P1).
 * The key NAMES here are unchanged so the toggle, CSS vars, antd ConfigProvider and
 * `getColorCode()` keep working — only the values changed (amber Petrol → blue v2).
 */

export type ThemeMode = 'light' | 'dark'

// Light mode — designed on its own terms (NOT a dark inversion). Sovereign-blue brand on a
// cool paper canvas; AA-tuned dark text. Status keys reused by widget CRs: green=success(teal-
// green), orange/warning=warning(amber), red/error=error(crimson), blue/primary/info=brand,
// cyan/teal=healthy accent, magenta/violet=drift/chart. Chart-cat anchors (teal/olive/slate)
// added for getColorCode() parity with the v2 chart palette.
export const color = {
  accent2: '#0E9488',
  accentSoft: '#E6F7FC',
  background: '#F5F5F5',
  blue: '#11B2E2',
  border: '#E1E3E8',
  dark: '#141414',
  darkBlue: '#05629A',
  // Status keys double as widget-CR Tag INK (getTagStyle), so in light mode they use the v2
  // AA-safe `-text` variants (≥4.5:1 as text), not the brighter fill/dot base (#DE3B3B/#009765/
  // #FFAA00, which are 3:1 non-text). Dark mode keeps the bright bases (they pass on the void).
  error: '#B92F2F',
  errorSoft: '#FEECEC',
  faint: '#7A7A7A',
  gray: '#5C5C5C',
  green: '#00744E',
  info: '#05629A',
  light: '#FFFFFF',
  lightgray: '#F5F5F5',
  line: '#E1E3E8',
  // Nav surface — ALWAYS the Sovereign Blue gradient (invariant across modes); text is light.
  menubgend: '#002F46',
  menubgstart: '#005D8B',
  menuitem: 'rgba(255,255,255,0.50)',
  menuitembg: 'rgba(17,178,226,0.40)',
  orange: '#8A5C00',
  panelbg: '#FBFBFB',
  primary: '#05629A',
  red: '#B92F2F',
  success: '#00744E',
  successSoft: '#E3FBF2',
  text: '#141414',
  violet: '#722ED1',
  warning: '#8A5C00',
  warningSoft: '#FFF6E0',
  // v2 status/chart language (explicit aliases for widget CR `color:` refs).
  cyan: '#0E9488',
  magenta: '#C13B7E',
  amber: '#8A5C00',
  gold: '#8A5C00',
  teal: '#0E9488',
  olive: '#879500',
  slate: '#5F7285',
} as const

/**
 * Dark mode — the deep-ink canvas. `background` = true black (app), `panelbg` = surface
 * (#141414 card), `light` = elevated (#1C1C1C popover/hover), `dark` = ink (#FFFFFF strongest
 * foreground). Brand = Krateo Blue (#2FBFE6 interactive); status brighter for the void.
 */
export const colorDark: Record<keyof typeof color, string> = {
  accent2: '#2CC5B9',
  accentSoft: 'rgba(17,178,226,0.16)',
  background: '#000000',
  blue: '#11B2E2',
  border: '#414141',
  dark: '#FFFFFF',
  darkBlue: '#05629A',
  error: '#F84C4C',
  errorSoft: '#401010',
  faint: '#7A7A7A',
  gray: '#A0A0A0',
  green: '#00D690',
  info: '#2FBFE6',
  light: '#1C1C1C',
  lightgray: '#1C1C1C',
  line: '#2A2A2A',
  menubgend: '#002F46',
  menubgstart: '#005D8B',
  menuitem: 'rgba(255,255,255,0.50)',
  menuitembg: 'rgba(17,178,226,0.40)',
  orange: '#FFAA00',
  panelbg: '#141414',
  primary: '#2FBFE6',
  red: '#F84C4C',
  success: '#00D690',
  successSoft: '#003323',
  text: '#FFFFFF',
  violet: '#9350DB',
  warning: '#FFAA00',
  warningSoft: '#3D2900',
  cyan: '#2CC5B9',
  magenta: '#E060A8',
  amber: '#FFAA00',
  gold: '#FFAA00',
  teal: '#2CC5B9',
  olive: '#AEC000',
  slate: '#8496AD',
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const

// v2 radii: 2 (sm) / 4 (md, default) / 8 (lg) / 12 (xl).
export const radius = { sm: 2, md: 4, lg: 8, xl: 12 } as const

/** Light elevation — soft, low-contrast shadows on a light canvas. */
export const elevation = {
  sm: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
  md: '0 4px 10px rgba(16,24,40,0.08)',
  lg: '0 12px 28px rgba(16,24,40,0.10)',
} as const

/** Dark elevation — near-flat; depth from the base→surface tint step, not drop shadows. */
export const elevationDark = {
  sm: '0 1px 2px rgba(0,0,0,0.45)',
  md: '0 2px 6px rgba(0,0,0,0.5)',
  lg: '0 10px 28px rgba(0,0,0,0.55)',
} as const

export const typography = {
  family: 'Inter, Roboto, "Helvetica Neue", Arial, "Noto Sans", system-ui, sans-serif',
  // Display = Barlow Condensed (H1 + big numerals); mono = JetBrains Mono (all data:
  // ids/counts/durations/versions/namespaces). Loaded via the index.html font <link>.
  display: '"Barlow Condensed", Inter, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, "Courier New", monospace',
  size: { xxs: 12, xs: 14, sm: 16, md: 18, lg: 24, xl: 30 },
  weight: { lighter: 300, light: 400, medium: 500, bold: 600, bolder: 700 },
} as const

export const motion = { fast: '0.12s', mid: '0.24s', slow: '0.4s' } as const

export const tokens = { color, elevation, motion, radius, spacing, typography } as const

/** Per-component overrides. Tight density (32px controls), v2 radii, near-flat cards. */
const buildComponents = (palette: Record<keyof typeof color, string>, mode: ThemeMode): ThemeConfig['components'] => ({
  Button: {
    borderRadius: radius.md,
    controlHeight: 32,
    fontWeight: typography.weight.bold,
    primaryShadow: 'none',
    // WCAG AA (brand v2): the primary-button label is `colorTextLightSolid`. Light primary is
    // Sovereign #05629A — WHITE text yields ~6.5:1 (antd default, no override needed). DARK
    // primary is the bright Krateo Blue #2FBFE6 — white would be only ~2.2:1, so the label
    // flips to the DARK ink (surface #141414 = palette.panelbg) → ~8.3:1. The amber-era override
    // (dark-ink in LIGHT) is retired; the pairing is inverted for blue.
    ...(mode === 'dark' ? { colorTextLightSolid: palette.panelbg } : {}),
  },
  Card: {
    borderRadiusLG: radius.lg,
    boxShadowTertiary: mode === 'dark' ? elevationDark.sm : elevation.sm,
    paddingLG: 14,
  },
  DatePicker: { borderRadius: radius.md, controlHeight: 32 },
  Drawer: { paddingLG: spacing.lg },
  Input: { borderRadius: radius.md, controlHeight: 32 },
  List: { borderRadiusLG: radius.lg },
  // Sidebar nav density — match the mockup `.nav-item` (padding 7px 9px · 13px · ~30px tall).
  Menu: { fontSize: 13, itemBorderRadius: radius.md, itemHeight: 30, itemMarginBlock: 0, itemPaddingInline: 9, subMenuItemBorderRadius: radius.md },
  Modal: { borderRadiusLG: radius.xl },
  Progress: { defaultColor: palette.green },
  Select: { borderRadius: radius.md, controlHeight: 32 },
  Statistic: { contentFontSize: 31, titleFontSize: 13 },
  Steps: { iconSize: 28 },
  Table: { borderColor: palette.border, borderRadiusLG: radius.lg, cellPaddingBlock: 9, headerBg: palette.lightgray, headerBorderRadius: radius.lg, headerColor: palette.gray, rowHoverBg: palette.light },
  Tabs: { horizontalItemGutter: 24 },
  Tag: { borderRadiusSM: radius.sm },
})

/** Light antd theme (brand v2 blue). compactAlgorithm = the instrument-density pass. */
export const lightTheme: ThemeConfig = {
  algorithm: [antdAlgorithms.defaultAlgorithm, antdAlgorithms.compactAlgorithm],
  token: {
    borderRadius: radius.md,
    boxShadow: elevation.md,
    boxShadowSecondary: elevation.lg,
    colorBgBase: color.background,
    colorBgContainer: color.panelbg,
    colorBgElevated: color.light,
    colorBgLayout: color.background,
    colorBorder: color.border,
    colorBorderSecondary: '#C9CCD3',
    colorError: color.error,
    colorInfo: color.info,
    colorLink: '#0A7194',
    colorPrimary: color.primary,
    colorSuccess: color.success,
    colorTextBase: color.text,
    colorWarning: color.warning,
    colorWhite: color.light,
    controlHeight: 32,
    fontFamily: typography.family,
    motionDurationMid: motion.mid,
    motionDurationSlow: motion.slow,
  },
  components: buildComponents(color, 'light'),
}

/** Dark antd theme (brand v2 blue) — antd dark + compact + Krateo-blue / status overrides. */
export const darkTheme: ThemeConfig = {
  algorithm: [antdAlgorithms.darkAlgorithm, antdAlgorithms.compactAlgorithm],
  token: {
    borderRadius: radius.md,
    boxShadow: elevationDark.md,
    boxShadowSecondary: elevationDark.lg,
    colorBgBase: colorDark.background,
    colorBgContainer: colorDark.panelbg,
    colorBgElevated: colorDark.light,
    colorBgLayout: colorDark.background,
    colorBorder: colorDark.border,
    colorBorderSecondary: colorDark.line,
    colorError: colorDark.error,
    colorInfo: colorDark.info,
    colorLink: '#5CCDEB',
    colorPrimary: colorDark.primary,
    colorSuccess: colorDark.success,
    colorTextBase: colorDark.text,
    colorWarning: colorDark.warning,
    controlHeight: 32,
    fontFamily: typography.family,
    motionDurationMid: motion.mid,
    motionDurationSlow: motion.slow,
  },
  components: buildComponents(colorDark, 'dark'),
}

/** Back-compat alias (was the single light theme). */
export const antdTheme = lightTheme

/** Resolve the antd theme for a mode. */
export const getAntdTheme = (mode: ThemeMode): ThemeConfig => (mode === 'dark' ? darkTheme : lightTheme)

/** Inject every token as a CSS custom property on `:root` for the given mode. */
export const cssVariables = (mode: ThemeMode = 'light') => {
  const root = document.documentElement
  const palette = mode === 'dark' ? colorDark : color
  const elevationSet = mode === 'dark' ? elevationDark : elevation

  Object.entries(palette).forEach(([key, value]) => root.style.setProperty(`--${key}-color`, value))
  Object.entries(spacing).forEach(([key, value]) => root.style.setProperty(`--spacing-${key}`, `${value}px`))
  Object.entries(radius).forEach(([key, value]) => root.style.setProperty(`--radius-${key}`, `${value}px`))
  Object.entries(elevationSet).forEach(([key, value]) => root.style.setProperty(`--elevation-${key}`, value))
  Object.entries(motion).forEach(([key, value]) => root.style.setProperty(`--motion-${key}`, value))
  Object.entries(typography.size).forEach(([key, value]) => root.style.setProperty(`--font-size-${key}`, `${value}px`))
  Object.entries(typography.weight).forEach(([key, value]) => root.style.setProperty(`--font-weight-${key}`, `${value}`))
  root.style.setProperty('--font-family', typography.family)
  root.style.setProperty('--font-display', typography.display)
  root.style.setProperty('--font-mono', typography.mono)
}
