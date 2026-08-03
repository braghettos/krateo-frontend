import type { CSSProperties } from 'react'

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

/**
 * Petrol soft-tint pill style for a brand/semantic color NAME (status Tags, chips).
 * Resolves the name → the EXACT Petrol hex via `getColorCode` (NOT antd's built-in
 * preset palette, which renders an off-brand green/red/gold), then returns the
 * mockup's pill: coloured ink on a low-alpha tint with a mid-alpha border. Theme-aware
 * (the hex follows the light/dark toggle). Apply to an uncoloured `<Tag style={…}>`.
 */
export const getTagStyle = (colorName: string | undefined): CSSProperties => {
  const hex = getColorCode(colorName)
  return {
    backgroundColor: `color-mix(in srgb, ${hex} 15%, transparent)`,
    borderColor: `color-mix(in srgb, ${hex} 38%, transparent)`,
    color: hex,
  }
}

export default PALETTE
