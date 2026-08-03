// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'

import { getChartCatColor, getChartCatPalette } from './chart-utils'

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
})

describe('chart-utils — v2 categorical palette (Brand v2 §1.5)', () => {
  it('returns a 10-colour palette', () => {
    expect(getChartCatPalette()).toHaveLength(10)
  })

  it('light mode → the light palette (cat-01 = #0E93BB)', () => {
    document.documentElement.setAttribute('data-theme', 'light')
    expect(getChartCatPalette()[0]).toBe('#0E93BB')
  })

  it('dark mode → the dark palette (cat-01 = Krateo Blue #11B2E2)', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    expect(getChartCatPalette()[0]).toBe('#11B2E2')
  })

  it('getChartCatColor wraps at 10 and never returns undefined', () => {
    expect(getChartCatColor(10)).toBe(getChartCatColor(0))
    expect(getChartCatColor(23)).toBeTruthy()
  })
})
