/* eslint-disable sort-keys/sort-keys-fix */
// Token scales are ordered semantically (xs → xl, token before components), not alphabetically.
import { theme as antdAlgorithms, type ThemeConfig } from 'antd'

/**
 * Single source of truth for the design system. Everything else derives from
 * here: the antd `ThemeConfig` (`lightTheme` / `darkTheme`) and the `:root` CSS
 * custom properties (`cssVariables`) consumed by `*.module.css`.
 *
 * BRAND = "Petrol & Phosphor (Flight Deck)" — a dark-first instrument console.
 * The bold move: AMBER is the brand (primary/focus/your-attention), demoted from
 * "warning" to identity; status is a four-colour SEMANTIC language — cyan
 * (healthy/nominal/actual-matches-desired), magenta (drift), crimson (failed),
 * amber (pending/target). Dark = matte petrol-void→bezel depth (NO frosted glass);
 * light ("Paper") is a fully-supported equal with luminance retuned for AA.
 * The key NAMES are unchanged so the toggle, CSS vars, antd ConfigProvider and
 * `getColorCode()` keep working — only the values changed.
 */

export type ThemeMode = 'light' | 'dark'

// Light "Paper" — cool paper sheet, ferro-graphite ink, AA-darkened amber brand.
// Status keys reused: green=healthy(teal), orange/warning=pending(amber),
// red/error=failed(crimson), violet=drift(magenta), blue/primary/info=brand(amber).
export const color = {
  accent2: '#0E8F86',
  accentSoft: 'rgba(192,118,11,0.10)',
  background: '#F6F8FA',
  blue: '#C0760B',
  border: '#E2E6EC',
  dark: '#131A22',
  darkBlue: '#9A5A08',
  error: '#C5333A',
  errorSoft: 'rgba(197,51,58,0.10)',
  faint: '#8A95A2',
  gray: '#5C6976',
  green: '#0E8F86',
  info: '#C0760B',
  light: '#FFFFFF',
  lightgray: '#EEF1F4',
  line: '#E8EBEF',
  menubgend: '#C0760B',
  menubgstart: '#C0760B',
  menuitem: '#5C6976',
  menuitembg: 'rgba(192,118,11,0.10)',
  orange: '#C0760B',
  panelbg: '#FFFFFF',
  primary: '#C0760B',
  red: '#C5333A',
  success: '#0E8F86',
  successSoft: 'rgba(14,143,134,0.10)',
  text: '#131A22',
  violet: '#A6358F',
  warning: '#C0760B',
  warningSoft: 'rgba(192,118,11,0.12)',
  // Petrol status language (explicit aliases for widget CR `color:` refs).
  cyan: '#0E8F86',
  magenta: '#A6358F',
  amber: '#C0760B',
  // antd preset alias used by status cells for "pending" — map to the amber brand
  // (was absent → getColorCode('gold') fell back to ink, and antd's preset gold is off-brand).
  gold: '#C0760B',
} as const

/**
 * Dark "Petrol" — the canonical dark-first canvas. `background` = petrol-void
 * (app), `panelbg` = bezel (OPAQUE matte card — no translucency/blur), `light` =
 * bezel-2 (elevated/hover/active-nav), `lightgray` = bezel-2 (table header fill),
 * `dark` = ink (strongest foreground). Brand = amber; status = cyan/magenta/crimson.
 */
export const colorDark: Record<keyof typeof color, string> = {
  accent2: '#34D6C8',
  accentSoft: 'rgba(242,163,60,0.16)',
  background: '#070C12',
  blue: '#F2A33C',
  border: 'rgba(230,237,243,0.10)',
  dark: '#E6EDF3',
  darkBlue: '#F5B86A',
  error: '#F2545B',
  errorSoft: 'rgba(242,84,91,0.16)',
  faint: '#6A7682',
  gray: '#8A97A6',
  green: '#34D6C8',
  info: '#F2A33C',
  light: '#111E2A',
  lightgray: '#111E2A',
  line: 'rgba(230,237,243,0.07)',
  menubgend: '#F2A33C',
  menubgstart: '#F2A33C',
  menuitem: '#8A97A6',
  menuitembg: '#111E2A',
  orange: '#F2A33C',
  panelbg: '#0E1620',
  primary: '#F2A33C',
  red: '#F2545B',
  success: '#34D6C8',
  successSoft: 'rgba(52,214,200,0.15)',
  text: '#E6EDF3',
  violet: '#D86BC4',
  warning: '#F2A33C',
  warningSoft: 'rgba(242,163,60,0.15)',
  cyan: '#34D6C8',
  magenta: '#D86BC4',
  amber: '#F2A33C',
  // antd preset alias for "pending" status cells — the dark amber brand (mirrors
  // the light `gold` → amber aliasing). Required by Record<keyof typeof color>.
  gold: '#F2A33C',
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const

// Instrument radii: 6 on cards/controls, 4 on tags/chips, 2 on rails/gauges (per-CR).
export const radius = { sm: 4, md: 6, lg: 6, xl: 10 } as const

/** Paper (light) elevation — soft, low-contrast shadows on a light canvas. */
export const elevation = {
  sm: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
  md: '0 4px 10px rgba(16,24,40,0.08)',
  lg: '0 12px 28px rgba(16,24,40,0.10)',
} as const

/** Petrol (dark) elevation — near-flat: depth comes from the void→bezel tint
 * step, not drop shadows (an instrument bezel doesn't float). */
export const elevationDark = {
  sm: '0 1px 2px rgba(0,0,0,0.45)',
  md: '0 2px 6px rgba(0,0,0,0.5)',
  lg: '0 10px 28px rgba(0,0,0,0.55)',
} as const

export const typography = {
  family: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  // Display = Space Grotesk (H1 + big numerals); mono = IBM Plex Mono (all data:
  // ids/counts/durations/versions/namespaces). Loaded via the index.css @import.
  display: '"Space Grotesk", Inter, system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  size: { xxs: 12, xs: 14, sm: 16, md: 18, lg: 24, xl: 30 },
  weight: { lighter: 300, light: 400, medium: 500, bold: 600, bolder: 700 },
} as const

export const motion = { fast: '0.1s', mid: '0.2s', slow: '0.3s' } as const

export const tokens = { color, elevation, motion, radius, spacing, typography } as const

/**
 * Runtime (per-install / per-Org/Tenant) theme override, delivered through the same
 * ConfigMap-mounted `config.json` that already serves the login branding — so a tenant
 * portal re-brands at runtime with NO rebuild. Absent → the built-in tokens above apply
 * unchanged (they remain the single fallback source of truth).
 *
 * - `primaryColor` rewrites the BRAND keys only (primary/link/nav accent) in both color
 *   modes; the four-colour SEMANTIC status language (success/error/warning/drift) is
 *   deliberately left intact so status stays readable under any brand.
 * - `palette.light` / `palette.dark` allow token-level fine-tuning per mode for installs
 *   that need more than a primary swap.
 */
export interface ThemeOverride {
  palette?: Partial<Record<ThemeMode, Partial<Record<keyof typeof color, string>>>>
  primaryColor?: string
}

/** The palette keys that carry the BRAND (not semantic status) — what `primaryColor` rewrites. */
const BRAND_KEYS: ReadonlyArray<keyof typeof color> = ['primary', 'blue', 'info', 'darkBlue', 'menubgstart', 'menubgend']

/**
 * Resolve the effective palette for a mode: built-in tokens, overlaid with the runtime
 * override (primaryColor → brand keys + derived soft tint, then per-mode palette entries).
 * Returns the built-in palette object untouched when there is nothing to override.
 */
export const resolvePalette = (mode: ThemeMode, override?: ThemeOverride): Record<keyof typeof color, string> => {
  const base = mode === 'dark' ? colorDark : color
  if (!override?.primaryColor && !override?.palette?.[mode]) {
    return base
  }

  const resolved: Record<keyof typeof color, string> = { ...base }
  if (override.primaryColor) {
    BRAND_KEYS.forEach((key) => { resolved[key] = override.primaryColor! })
    // Soft brand tint (hover/selected fills) derived from the override — CSS-var only
    // (color-mix is fine in stylesheets; antd tokens below use the plain hex).
    resolved.accentSoft = `color-mix(in srgb, ${override.primaryColor} ${mode === 'dark' ? '16%' : '10%'}, transparent)`
    if (mode === 'light') {
      // Light nav-item fill is a brand tint (dark uses the neutral bezel — leave it).
      resolved.menuitembg = `color-mix(in srgb, ${override.primaryColor} 10%, transparent)`
    }
  }
  Object.assign(resolved, override.palette?.[mode])

  return resolved
}

/** Per-component overrides. Tight instrument density (32px controls), 6px radii,
 * near-flat cards; the palette-derived bits (Progress=cyan, Table header fill)
 * follow the active mode. */
const buildComponents = (palette: Record<keyof typeof color, string>, mode: ThemeMode): ThemeConfig['components'] => ({
  Button: { borderRadius: radius.md, controlHeight: 32, fontWeight: typography.weight.bold, primaryShadow: 'none' },
  Card: {
    borderRadiusLG: radius.lg,
    boxShadowTertiary: mode === 'dark' ? elevationDark.sm : elevation.sm,
    paddingLG: 14,
  },
  DatePicker: { borderRadius: radius.md, controlHeight: 32 },
  Drawer: { paddingLG: spacing.lg },
  Input: { borderRadius: radius.md, controlHeight: 32 },
  List: { borderRadiusLG: radius.lg },
  // Sidebar nav density — match the mockup `.nav-item` (padding 7px 9px · 13px · ~30px tall),
  // not antd's 36px/14px default (which read "larger than the render").
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

/** Build the antd ThemeConfig for a mode from a (possibly override-resolved) palette.
 * Light = "Paper" (default+compact algorithms); dark = "Petrol" (dark+compact).
 * compactAlgorithm = the instrument-panel density pass: tighter paddings/margins/gaps across
 * every component (cards/tables/lists/descriptions/forms), fonts unchanged (D5/O1).
 * Dark note: the bg/border MAP tokens are PINNED to the exact palette values — antd otherwise
 * DERIVES them from the blue-leaning void base + dark algorithm, producing a lighter
 * blue-tinted container (#0d1f35) and a blue border (#183962) instead of the neutral bezel.
 * colorBgContainer = card/input fill (bezel), colorBgElevated = popover/dropdown/modal
 * (bezel-2), colorBgLayout = page (void); colorBorderSecondary = the card's hairline. */
const buildAntdTheme = (palette: Record<keyof typeof color, string>, mode: ThemeMode): ThemeConfig => {
  const elevationSet = mode === 'dark' ? elevationDark : elevation
  return {
    algorithm: mode === 'dark'
      ? [antdAlgorithms.darkAlgorithm, antdAlgorithms.compactAlgorithm]
      : [antdAlgorithms.defaultAlgorithm, antdAlgorithms.compactAlgorithm],
    token: {
      borderRadius: radius.md,
      boxShadow: elevationSet.md,
      boxShadowSecondary: elevationSet.lg,
      colorBgBase: mode === 'dark' ? palette.background : palette.panelbg,
      colorBgContainer: palette.panelbg,
      colorBgElevated: palette.light,
      colorBgLayout: palette.background,
      colorBorder: palette.border,
      colorBorderSecondary: palette.border,
      colorError: palette.error,
      colorInfo: palette.info,
      colorLink: palette.primary,
      colorPrimary: palette.primary,
      colorSuccess: palette.success,
      colorTextBase: palette.text,
      colorWarning: palette.warning,
      ...(mode === 'light' ? { colorWhite: palette.light } : {}),
      controlHeight: 32,
      fontFamily: typography.family,
      motionDurationMid: motion.mid,
      motionDurationSlow: motion.slow,
    },
    components: buildComponents(palette, mode),
  }
}

/** Light "Paper" antd theme (built-in tokens, no runtime override). */
export const lightTheme: ThemeConfig = buildAntdTheme(color, 'light')

/** Dark "Petrol" antd theme — antd dark + compact algorithms + amber-brand / cyan-status overrides. */
export const darkTheme: ThemeConfig = buildAntdTheme(colorDark, 'dark')

/** Back-compat alias (was the single light theme). */
export const antdTheme = lightTheme

/** Resolve the antd theme for a mode, applying the runtime per-tenant override when present.
 * Without an override this returns the prebuilt (referentially stable) theme objects. */
export const getAntdTheme = (mode: ThemeMode, override?: ThemeOverride): ThemeConfig => {
  const base = mode === 'dark' ? colorDark : color
  const palette = resolvePalette(mode, override)
  if (palette === base) {
    return mode === 'dark' ? darkTheme : lightTheme
  }

  return buildAntdTheme(palette, mode)
}

/** Inject every token as a CSS custom property on `:root` for the given mode, applying the
 * runtime per-tenant override when present (S8/D20 path — same vars, new values, no rebuild). */
export const cssVariables = (mode: ThemeMode = 'light', override?: ThemeOverride) => {
  const root = document.documentElement
  const palette = resolvePalette(mode, override)
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
