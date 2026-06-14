import { color, colorDark } from './tokens'

/**
 * Color palette. The canonical values live in `tokens.ts`; this module is kept
 * for backwards-compatible imports (`PALETTE`, `getColorCode`).
 */
const PALETTE = color

type PaletteColor = keyof typeof PALETTE

/**
 * Resolve a brand/semantic color name to a hex code for the active color mode.
 * Reads `data-theme` (set by `ThemeModeProvider`) so inline-style/canvas callers
 * follow the light/dark toggle. Components re-render on toggle (the antd
 * `ConfigProvider` theme changes), so this re-evaluates with the new mode.
 */
export const getColorCode = (colorName: string | undefined) => {
  const isDark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'
  const palette = isDark ? colorDark : color

  if (colorName && colorName in palette) {
    return palette[colorName as PaletteColor]
  }

  return palette.dark
}

export default PALETTE
