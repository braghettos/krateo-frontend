/**
 * v2 categorical chart palette (Brand v2, issue #49 §1.5 — CVD-audited, DO NOT reorder).
 * Mode-aware: dark = bright on the void; light = deeper for legibility on paper. Chart series
 * are non-text FILLS (WCAG 3:1), so they stay vibrant in light mode even though the status
 * TEXT tokens use the darker AA `-text` variants.
 *
 * Used for AUTO-assigned chart series (no operator colour). Operator-specified colours still go
 * through getColorCode(name) — that is intentional control and is not overridden.
 */

const CHART_CAT_DARK = [
  '#11B2E2', '#FFAA00', '#00D690', '#9350DB', '#F84C4C',
  '#2CC5B9', '#E060A8', '#AEC000', '#8496AD', '#A0A0A0',
] as const

const CHART_CAT_LIGHT = [
  '#0E93BB', '#DB9200', '#009765', '#722ED1', '#DE3B3B',
  '#0E9488', '#C13B7E', '#879500', '#5F7285', '#7A7A7A',
] as const

const isDark = (): boolean =>
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'

/** The full 10-colour categorical palette for the active theme (G2 `scale.color.range`). */
export const getChartCatPalette = (): string[] => (isDark() ? [...CHART_CAT_DARK] : [...CHART_CAT_LIGHT])

/** One categorical colour by series index (wraps at 10). */
export const getChartCatColor = (index: number): string => {
  const palette = getChartCatPalette()
  return palette[((index % palette.length) + palette.length) % palette.length]
}
