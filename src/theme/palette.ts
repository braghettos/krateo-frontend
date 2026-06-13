import { color } from './tokens'

/**
 * Color palette. The canonical values live in `tokens.ts`; this module is kept
 * for backwards-compatible imports (`PALETTE`, `getColorCode`).
 */
const PALETTE = color

type PaletteColor = keyof typeof PALETTE

export const getColorCode = (colorName: string | undefined) => {
  if (colorName && colorName in PALETTE) {
    return PALETTE[colorName as PaletteColor]
  }

  return PALETTE.dark
}

export default PALETTE
