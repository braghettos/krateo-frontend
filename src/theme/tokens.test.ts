import { describe, expect, it } from 'vitest'

import { color, colorDark, darkTheme, getAntdTheme, lightTheme, resolvePalette } from './tokens'

describe('resolvePalette (runtime per-tenant theme override, S8/D20)', () => {
  it('returns the built-in palette object UNTOUCHED (same reference) when there is no override', () => {
    expect(resolvePalette('light')).toBe(color)
    expect(resolvePalette('dark')).toBe(colorDark)
    expect(resolvePalette('light', {})).toBe(color)
    expect(resolvePalette('light', { palette: { dark: { primary: '#123456' } } })).toBe(color)
  })

  it('primaryColor rewrites the BRAND keys in both modes', () => {
    const light = resolvePalette('light', { primaryColor: '#1677FF' })
    const dark = resolvePalette('dark', { primaryColor: '#1677FF' })

    for (const palette of [light, dark]) {
      expect(palette.primary).toBe('#1677FF')
      expect(palette.blue).toBe('#1677FF')
      expect(palette.info).toBe('#1677FF')
    }
  })

  it('primaryColor leaves the SEMANTIC status colors intact', () => {
    const palette = resolvePalette('light', { primaryColor: '#1677FF' })

    expect(palette.error).toBe(color.error)
    expect(palette.success).toBe(color.success)
    expect(palette.violet).toBe(color.violet)
    // warning stays the built-in amber: status language survives any brand.
    expect(palette.warning).toBe(color.warning)
  })

  it('per-mode palette entries apply on top of primaryColor and only to their mode', () => {
    const override = { palette: { light: { background: '#FAFAFA' } }, primaryColor: '#1677FF' }

    expect(resolvePalette('light', override).background).toBe('#FAFAFA')
    expect(resolvePalette('dark', override).background).toBe(colorDark.background)
  })
})

describe('getAntdTheme with override', () => {
  it('returns the prebuilt (referentially stable) themes without an override', () => {
    expect(getAntdTheme('light')).toBe(lightTheme)
    expect(getAntdTheme('dark')).toBe(darkTheme)
  })

  it('derives colorPrimary/colorLink from the override, keeping status tokens', () => {
    const theme = getAntdTheme('light', { primaryColor: '#1677FF' })

    expect(theme.token?.colorPrimary).toBe('#1677FF')
    expect(theme.token?.colorLink).toBe('#1677FF')
    expect(theme.token?.colorError).toBe(color.error)
    expect(theme.token?.colorSuccess).toBe(color.success)
  })
})
