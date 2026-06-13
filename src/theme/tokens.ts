/* eslint-disable sort-keys/sort-keys-fix */
// Token scales are ordered semantically (xs → xl, token before components), not alphabetically.
import type { ThemeConfig } from 'antd'

/**
 * Single source of truth for the design system. Everything else derives from
 * here: the antd `ThemeConfig` (`antdTheme`) and the `:root` CSS custom
 * properties (`cssVariables`) consumed by `*.module.css`.
 *
 * Colors/spacing/typography reproduce the previously-scattered values exactly
 * (no visual drift); radius / elevation / motion / control sizing are added to
 * modernize the look uniformly.
 */

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

/** antd theme derived from the tokens (global token + per-component overrides). */
export const antdTheme: ThemeConfig = {
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
    colorSuccessBg: color.success,
    colorTextBase: color.text,
    colorWarning: color.warning,
    colorWhite: color.light,
    controlHeight: 36,
    fontFamily: typography.family,
    motionDurationMid: motion.mid,
    motionDurationSlow: motion.slow,
  },
  components: {
    Button: { borderRadius: radius.md, controlHeight: 36, fontWeight: typography.weight.bold, primaryShadow: 'none' },
    Card: { borderRadiusLG: radius.lg, boxShadowTertiary: elevation.sm, paddingLG: spacing.lg },
    DatePicker: { borderRadius: radius.md, controlHeight: 36 },
    Drawer: { paddingLG: spacing.lg },
    Input: { borderRadius: radius.md, controlHeight: 36 },
    List: { borderRadiusLG: radius.lg },
    Menu: { itemBorderRadius: radius.md, itemHeight: 40, subMenuItemBorderRadius: radius.md },
    Modal: { borderRadiusLG: radius.lg },
    Progress: { defaultColor: color.primary },
    Select: { borderRadius: radius.md, controlHeight: 36 },
    Steps: { iconSize: 28 },
    Table: { borderRadiusLG: radius.lg, headerBg: color.lightgray, headerBorderRadius: radius.lg },
    Tabs: { horizontalItemGutter: 24 },
    Tag: { borderRadiusSM: radius.sm },
  },
}

/** Inject every token as a CSS custom property on `:root`. */
export const cssVariables = () => {
  const root = document.documentElement

  Object.entries(color).forEach(([key, value]) => root.style.setProperty(`--${key}-color`, value))
  Object.entries(spacing).forEach(([key, value]) => root.style.setProperty(`--spacing-${key}`, `${value}px`))
  Object.entries(radius).forEach(([key, value]) => root.style.setProperty(`--radius-${key}`, `${value}px`))
  Object.entries(elevation).forEach(([key, value]) => root.style.setProperty(`--elevation-${key}`, value))
  Object.entries(motion).forEach(([key, value]) => root.style.setProperty(`--motion-${key}`, value))
  Object.entries(typography.size).forEach(([key, value]) => root.style.setProperty(`--font-size-${key}`, `${value}px`))
  Object.entries(typography.weight).forEach(([key, value]) => root.style.setProperty(`--font-weight-${key}`, `${value}`))
}
