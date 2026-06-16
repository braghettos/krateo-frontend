import { describe, expect, it } from 'vitest'

import type { ResourcesRefs } from '../../types/Widget'

import { buildNavModel, hasInlineNav } from './navModel'

const resourcesRefs: ResourcesRefs = {
  items: [
    { allowed: true, id: 'home-page', path: '/call?resource=flexes&name=home', payload: {}, verb: 'GET' },
    { allowed: true, id: 'settings-page', path: '/call?resource=flexes&name=settings', payload: {}, verb: 'GET' },
  ],
}

describe('Menu navModel', () => {
  it('hasInlineNav detects folded inline items vs ref-only', () => {
    expect(hasInlineNav([{ label: 'Home', path: '/home', resourceRefId: 'x' }])).toBe(true)
    expect(hasInlineNav([{ resourceRefId: 'x' }])).toBe(false)
    expect(hasInlineNav(undefined)).toBe(false)
  })

  it('builds entries + routes from inline items, sorted by order, resolving content endpoints', () => {
    const items = [
      { icon: 'fa-gear', label: 'Settings', order: 20, path: '/settings', resourceRefId: 'settings-page' },
      { icon: 'fa-home', label: 'Home', order: 10, path: '/home', resourceRefId: 'home-page' },
    ]
    const { entries, routes } = buildNavModel(items, resourcesRefs)

    expect(entries.map((entry) => entry.label)).toEqual(['Home', 'Settings'])
    expect(entries[0]).toEqual({ iconName: 'fa-home', key: '/home', label: 'Home' })
    expect(routes[0]).toEqual({ path: '/home', resourceRef: resourcesRefs.items[0], resourceRefId: 'home-page', title: 'Home' })
  })

  it('skips items missing path or label', () => {
    const { entries, routes } = buildNavModel([{ label: 'Home', resourceRefId: 'home-page' }], resourcesRefs)
    expect(entries).toHaveLength(0)
    expect(routes).toHaveLength(0)
  })
})
