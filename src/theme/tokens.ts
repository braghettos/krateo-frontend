/* eslint-disable sort-keys/sort-keys-fix */
// Token scales are ordered semantically (xs → xl, token before components), not alphabetically.
import { theme as antdAlgorithms, type ThemeConfig } from 'antd'

/**
 * Single source of truth for the design system. Everything else derives from
 * here: the antd `ThemeConfig` (`lightTheme` / `darkTheme`) and the `:root` CSS
 * custom properties (`cssVariables`) consumed by `*.module.css`.
 *
 * Light colors/spacing/typography reproduce the previously-scattered values
 * exactly (no visual drift); radius / elevation / motion / control sizing
 * modernize the look uniformly. The dark palette mirrors every key of `color`
 * so CSS variables and the antd theme switch coherently with the mode toggle.
 */

export type ThemeMode = 'light' | 'dark'

// Light = "Refined enterprise" mockup (theme-enterprise.css): antd blue #1677ff,
// tight 8px radius, soft-tint + bordered status colors, antd-neutral grays.
export const color = {
  accent2: '#11b2e2',
  accentSoft: '#e8f1ff',
  background: '#f5f7fa',
  blue: '#1677ff',
  border: '#e4e8ef',
  dark: '#1f2733',
  darkBlue: '#0958d9',
  error: '#d4380d',
  errorSoft: '#fcebe6',
  faint: '#98a2b3',
  gray: '#5b6675',
  green: '#15924c',
  info: '#1677ff',
  light: '#ffffff',
  lightgray: '#f3f5f8',
  line: '#eef1f5',
  menubgend: '#11b2e2',
  menubgstart: '#1677ff',
  menuitem: '#5b6675',
  menuitembg: '#e8f1ff',
  orange: '#ca8504',
  panelbg: '#ffffff',
  primary: '#1677ff',
  red: '#d4380d',
  success: '#15924c',
  successSoft: '#e7f5ec',
  text: '#1f2733',
  violet: '#722ed1',
  warning: '#ca8504',
  warningSoft: '#fbf2dd',
} as const

/**
 * Dark palette — same keys as `color`, retuned for a dark "glass" canvas:
 * deep slate backgrounds, elevated surfaces, brightened brand accents for
 * contrast. `background` = app canvas, `panelbg` = card surface, `light` =
 * elevated/hover surface, `lightgray` = subtle fill / table header, `dark` =
 * strongest foreground (white).
 */
export const colorDark: Record<keyof typeof color, string> = {
  accent2: '#22d3ee',
  accentSoft: 'rgba(94,139,255,0.16)',
  background: '#0a0e1a',
  blue: '#5e8bff',
  border: 'rgba(255,255,255,0.10)',
  dark: '#ffffff',
  darkBlue: '#7cc6ec',
  error: '#fb7185',
  errorSoft: 'rgba(251,113,133,0.16)',
  faint: '#6b7796',
  gray: '#9aa6c0',
  green: '#34d399',
  info: '#5e8bff',
  light: 'rgba(255,255,255,0.08)',
  lightgray: 'rgba(255,255,255,0.08)',
  line: 'rgba(255,255,255,0.07)',
  menubgend: '#5e8bff',
  menubgstart: '#22d3ee',
  menuitem: '#9aa6c0',
  menuitembg: 'rgba(94,139,255,0.16)',
  orange: '#fbbf24',
  panelbg: 'rgba(255,255,255,0.055)',
  primary: '#5e8bff',
  red: '#fb7185',
  success: '#34d399',
  successSoft: 'rgba(52,211,153,0.15)',
  text: '#eaf0fb',
  violet: '#8b5cf6',
  warning: '#fbbf24',
  warningSoft: 'rgba(251,191,36,0.15)',
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const

export const radius = { sm: 4, md: 8, lg: 10, xl: 16 } as const

/** Clean (light) elevation — soft, low-contrast shadows on a light canvas. */
export const elevation = {
  sm: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
  md: '0 4px 10px rgba(16,24,40,0.08)',
  lg: '0 12px 28px rgba(16,24,40,0.10)',
} as const

/** Glass (dark) elevation — deeper, more diffuse shadows for the dark canvas. */
export const elevationDark = {
  sm: '0 2px 10px rgba(0,0,0,0.35)',
  md: '0 8px 24px rgba(0,0,0,0.45)',
  lg: '0 22px 50px rgba(0,0,0,0.55)',
} as const

export const typography = {
  family: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  size: { xxs: 12, xs: 14, sm: 16, md: 18, lg: 24, xl: 30 },
  weight: { lighter: 300, light: 400, medium: 500, bold: 600, bolder: 700 },
} as const

export const motion = { fast: '0.1s', mid: '0.2s', slow: '0.3s' } as const

export const tokens = { color, elevation, motion, radius, spacing, typography } as const

/** Per-component overrides. Radii / sizing are mode-independent; the
 * palette-derived bits (Progress color, Table header fill) and the Card
 * surface treatment (shadow + radius) vary by mode — Clean keeps tight,
 * low-elevation cards; Glass uses deeper shadows and a larger radius. */
const buildComponents = (palette: Record<keyof typeof color, string>, mode: ThemeMode): ThemeConfig['components'] => ({
  Button: { borderRadius: radius.md, controlHeight: 36, fontWeight: typography.weight.bold, primaryShadow: 'none' },
  Card: {
    borderRadiusLG: mode === 'dark' ? radius.xl : radius.lg,
    boxShadowTertiary: mode === 'dark' ? elevationDark.sm : elevation.sm,
    paddingLG: 18,
  },
  DatePicker: { borderRadius: radius.md, controlHeight: 36 },
  Drawer: { paddingLG: spacing.lg },
  Input: { borderRadius: radius.md, controlHeight: 36 },
  List: { borderRadiusLG: radius.lg },
  Menu: { itemBorderRadius: radius.md, itemHeight: 40, subMenuItemBorderRadius: radius.md },
  Modal: { borderRadiusLG: radius.lg },
  Progress: { defaultColor: palette.primary },
  Select: { borderRadius: radius.md, controlHeight: 36 },
  Statistic: { contentFontSize: 31, titleFontSize: 13 },
  Steps: { iconSize: 28 },
  Table: { borderRadiusLG: radius.lg, headerBg: palette.lightgray, headerBorderRadius: radius.lg },
  Tabs: { horizontalItemGutter: 24 },
  Tag: { borderRadiusSM: radius.sm },
})

/** Light antd theme — reproduces the previous `antdTheme` token block exactly. */
export const lightTheme: ThemeConfig = {
  algorithm: antdAlgorithms.defaultAlgorithm,
  token: {
    borderRadius: radius.md,
    boxShadow: elevation.md,
    boxShadowSecondary: elevation.lg,
    colorBgBase: color.panelbg,
    colorBorder: color.border,
    colorError: color.error,
    colorInfo: color.info,
    colorLink: color.primary,
    colorPrimary: color.primary,
    colorSuccess: color.success,
    colorTextBase: color.text,
    colorWarning: color.warning,
    colorWhite: color.light,
    controlHeight: 36,
    fontFamily: typography.family,
    motionDurationMid: motion.mid,
    motionDurationSlow: motion.slow,
  },
  components: buildComponents(color, 'light'),
}

/** Dark antd theme — antd dark algorithm + brand/neutral overrides from `colorDark`. */
export const darkTheme: ThemeConfig = {
  algorithm: antdAlgorithms.darkAlgorithm,
  token: {
    borderRadius: radius.md,
    boxShadow: elevation.md,
    boxShadowSecondary: elevation.lg,
    colorBgBase: colorDark.background,
    colorBorder: colorDark.border,
    colorError: colorDark.error,
    colorInfo: colorDark.info,
    colorLink: colorDark.primary,
    colorPrimary: colorDark.primary,
    colorSuccess: colorDark.success,
    colorTextBase: colorDark.text,
    colorWarning: colorDark.warning,
    controlHeight: 36,
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
}
