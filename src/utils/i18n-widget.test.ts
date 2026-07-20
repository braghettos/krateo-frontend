import { describe, expect, it } from 'vitest'

import i18n from '../i18n'

import { resolveWidgetString, resolveWidgetStrings } from './i18n-widget'

describe('resolveWidgetString (second-layer widget i18n, X2/D23)', () => {
  it('passes plain CR-authored strings through untouched', () => {
    expect(resolveWidgetString('This is a button')).toBe('This is a button')
  })

  it('resolves i18n:-prefixed keys against the catalogs', () => {
    expect(resolveWidgetString('i18n:chrome.notifications.title')).toBe(i18n.t('chrome.notifications.title'))
  })

  it('falls back to the key body for unknown keys (visible, greppable, never blank)', () => {
    expect(resolveWidgetString('i18n:widgets.some.unknown.key')).toBe('widgets.some.unknown.key')
  })

  it('resolves keys from runtime-registered bundles (install-provided vocabulary)', () => {
    i18n.addResourceBundle('en', 'translation', { widgets: { compositions: { title: 'Compositions' } } }, true, true)
    expect(resolveWidgetString('i18n:widgets.compositions.title')).toBe('Compositions')
  })
})

describe('resolveWidgetStrings (deep walk)', () => {
  it('walks nested objects and arrays, leaving non-string leaves as-is', () => {
    const widgetData = {
      count: 3,
      enabled: true,
      items: [{ label: 'i18n:chrome.userMenu.profile' }, { label: 'Plain label' }],
      nothing: null,
      title: 'i18n:chrome.notifications.title',
    }

    expect(resolveWidgetStrings(widgetData)).toEqual({
      count: 3,
      enabled: true,
      items: [{ label: i18n.t('chrome.userMenu.profile') }, { label: 'Plain label' }],
      nothing: null,
      title: i18n.t('chrome.notifications.title'),
    })
  })
})
