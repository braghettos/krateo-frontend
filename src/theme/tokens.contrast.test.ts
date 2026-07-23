/**
 * WCAG AA contrast regression test for the primary CTA button — Krateo Brand v2 (blue).
 *
 * The primary-button label colour is antd's `colorTextLightSolid`. Brand v2 inverts the amber-era
 * pairing:
 *   - LIGHT primary = Sovereign Blue #05629A (dark) → WHITE label ≈ 6.5:1 (antd default; NO override).
 *   - DARK  primary = Krateo Blue  #2FBFE6 (bright) → white would be only ~2.2:1, so the label flips
 *     to the DARK ink (surface #141414 = colorDark.panelbg) ≈ 8.3:1.
 *
 * This test pins: (a) light primary + white passes AA, (b) dark primary + white FAILS (the reason
 * for the flip), (c) dark primary + dark ink passes AA, (d/e) the Button token carries the correct
 * per-mode label colour.
 */

import { describe, expect, it } from 'vitest'

import { color, colorDark, lightTheme, darkTheme } from './tokens'

// ---------------------------------------------------------------------------
// WCAG helpers
// ---------------------------------------------------------------------------

function sRGBToLinear(c8bit: number): number {
  const ch = c8bit / 255
  return ch <= 0.04045 ? ch / 12.92 : Math.pow((ch + 0.055) / 1.055, 2.4)
}

function relativeLuminance(hex: string): number {
  const rr = parseInt(hex.slice(1, 3), 16)
  const gg = parseInt(hex.slice(3, 5), 16)
  const bb = parseInt(hex.slice(5, 7), 16)
  return 0.2126 * sRGBToLinear(rr) + 0.7152 * sRGBToLinear(gg) + 0.0722 * sRGBToLinear(bb)
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Primary CTA button — WCAG AA contrast (Brand v2 blue)', () => {
  it('light primary Sovereign Blue (#05629A) + white label passes AA ≥ 4.5:1', () => {
    const ratio = contrastRatio(color.primary, '#FFFFFF')
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('dark primary Krateo Blue (#2FBFE6) + white label FAILS AA (documents the flip)', () => {
    const ratio = contrastRatio(colorDark.primary, '#FFFFFF')
    expect(ratio).toBeLessThan(4.5)
  })

  it('dark primary (#2FBFE6) + dark ink (surface #141414) passes AA ≥ 4.5:1', () => {
    const ratio = contrastRatio(colorDark.primary, colorDark.panelbg)
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  it('lightTheme.components.Button does NOT override colorTextLightSolid (keeps white on Sovereign)', () => {
    const btn = lightTheme.components?.Button as Record<string, unknown> | undefined
    expect(btn?.colorTextLightSolid).toBeUndefined()
  })

  it('darkTheme.components.Button sets colorTextLightSolid = dark ink (surface #141414)', () => {
    const btn = darkTheme.components?.Button as Record<string, unknown> | undefined
    expect(btn?.colorTextLightSolid).toBe(colorDark.panelbg)
  })

  it('the two modes use different primaries (Sovereign light vs Krateo dark)', () => {
    expect(colorDark.primary).not.toBe(color.primary)
    // The dark primary is the brighter blue (higher luminance) for visibility on black.
    expect(relativeLuminance(colorDark.primary)).toBeGreaterThan(relativeLuminance(color.primary))
  })
})
