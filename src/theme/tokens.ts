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

export const color = {
  background: '#f5f5f5',
  blue: '#11B2E2',
  border: '#E1E3E8',
  dark: '#000000',
  darkBlue: '#05629A',
  error: '#f84c4c',
  gray: '#a0a0a0',
  green: '#00D690',
  info: '#11B2E2',
  light: '#FFFFFF',
  lightgray: '#F0F0F0',
  menubgend: '#002f46',
  menubgstart: '#005d8b',
  menuitem: '#ffffff80',
  menuitembg: '#11b2e266',
  orange: '#FFAA00',
  panelbg: '#FBFBFB',
  primary: '#05629A',
  red: '#F84C4C',
  success: '#00d690',
  text: '#323b40',
  violet: '#722ed1',
  warning: '#ffaa00',
} as const

/**
 * Dark palette — same keys as `color`, retuned for a dark "glass" canvas:
 * deep slate backgrounds, elevated surfaces, brightened brand accents for
 * contrast. `background` = app canvas, `panelbg` = card surface, `light` =
 * elevated/hover surface, `lightgray` = subtle fill / table header, `dark` =
 * strongest foreground (white).
 */
export const colorDark: Record<keyof typeof color, string> = {
  background: '#0b0f17',
  blue: '#29b6ec',
  border: '#2a3340',
  dark: '#ffffff',
  darkBlue: '#7cc6ec',
  error: '#ff6b6b',
  gray: '#8a93a3',
  green: '#1ee0a0',
  info: '#29b6ec',
  light: '#1b2230',
  lightgray: '#202836',
  menubgend: '#021621',
  menubgstart: '#06324c',
  menuitem: '#ffffff99',
  menuitembg: '#11b2e240',
  orange: '#ffb84d',
  panelbg: '#151b24',
  primary: '#2ba6e0',
  red: '#ff6b6b',
  success: '#1ee0a0',
  text: '#e6e9f0',
  violet: '#9a7cf0',
  warning: '#ffb84d',
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const

export const radius = { sm: 4, md: 8, lg: 12, xl: 16 } as const

export const elevation = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.06)',
  md: '0 2px 8px rgba(0, 0, 0, 0.09)',
  lg: '0 6px 16px rgba(0, 0, 0, 0.12)',
} as const

export const typography = {
  family: 'Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif',
  size: { xxs: 12, xs: 14, sm: 16, md: 18, lg: 24, xl: 30 },
  weight: { lighter: 300, light: 400, bold: 600 },
} as const

export const motion = { fast: '0.1s', mid: '0.2s', slow: '0.3s' } as const

export const tokens = { color, elevation, motion, radius, spacing, typography } as const

/** Per-component overrides (radii / sizing are mode-independent; only the
 * palette-derived bits — Progress color, Table header fill — vary by mode). */
const buildComponents = (palette: Record<keyof typeof color, string>): ThemeConfig['components'] => ({
  Button: { borderRadius: radius.md, controlHeight: 36, fontWeight: typography.weight.bold, primaryShadow: 'none' },
  Card: { borderRadiusLG: radius.lg, boxShadowTertiary: elevation.sm, paddingLG: spacing.lg },
  DatePicker: { borderRadius: radius.md, controlHeight: 36 },
  Drawer: { paddingLG: spacing.lg },
  Input: { borderRadius: radius.md, controlHeight: 36 },
  List: { borderRadiusLG: radius.lg },
  Menu: { itemBorderRadius: radius.md, itemHeight: 40, subMenuItemBorderRadius: radius.md },
  Modal: { borderRadiusLG: radius.lg },
  Progress: { defaultColor: palette.primary },
  Select: { borderRadius: radius.md, controlHeight: 36 },
  Steps: { iconSize: 28 },
  Table: { borderRadiusLG: radius.lg, headerBg: palette.lightgray, headerBorderRadius: radius.lg },
  Tabs: { horizontalItemGutter: 24 },
  Tag: { borderRadiusSM: radius.sm },
})

/** Light antd theme — reproduces the previous `antdTheme` token block exactly. */
export const lightTheme: ThemeConfig = {
  algorithm: antdAlgorithms.defaultAlgorithm,
  // Emit antd's `--ant-color-*` CSS variables so `*.module.css` consumers
  // resolve antd colors for the active color mode.
  cssVar: true,
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
  components: buildComponents(color),
}

/** Dark antd theme — antd dark algorithm + brand/neutral overrides from `colorDark`. */
export const darkTheme: ThemeConfig = {
  algorithm: antdAlgorithms.darkAlgorithm,
  cssVar: true,
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
  components: buildComponents(colorDark),
}

/** Back-compat alias (was the single light theme). */
export const antdTheme = lightTheme

/** Resolve the antd theme for a mode. */
export const getAntdTheme = (mode: ThemeMode): ThemeConfig => (mode === 'dark' ? darkTheme : lightTheme)

/** Inject every token as a CSS custom property on `:root` for the given mode. */
export const cssVariables = (mode: ThemeMode = 'light') => {
  const root = document.documentElement
  const palette = mode === 'dark' ? colorDark : color

  Object.entries(palette).forEach(([key, value]) => root.style.setProperty(`--${key}-color`, value))
  Object.entries(spacing).forEach(([key, value]) => root.style.setProperty(`--spacing-${key}`, `${value}px`))
  Object.entries(radius).forEach(([key, value]) => root.style.setProperty(`--radius-${key}`, `${value}px`))
  Object.entries(elevation).forEach(([key, value]) => root.style.setProperty(`--elevation-${key}`, value))
  Object.entries(motion).forEach(([key, value]) => root.style.setProperty(`--motion-${key}`, value))
  Object.entries(typography.size).forEach(([key, value]) => root.style.setProperty(`--font-size-${key}`, `${value}px`))
  Object.entries(typography.weight).forEach(([key, value]) => root.style.setProperty(`--font-weight-${key}`, `${value}`))
}
