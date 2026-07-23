import { describe, expect, it } from 'vitest'

import type { ResourcesRefs } from '../../types/Widget'

import { buildNavModel } from './navModel'

const resourcesRefs: ResourcesRefs = {
  items: [
    { allowed: true, id: 'home-page', path: '/call?resource=flexes&name=home', payload: {}, verb: 'GET' },
    { allowed: true, id: 'settings-page', path: '/call?resource=flexes&name=settings', payload: {}, verb: 'GET' },
  ],
}

describe('Menu navModel', () => {
  it('builds entries + routes from inline items, sorted by order, resolving content endpoints', () => {
    const items = [
      { icon: 'fa-gear', label: 'Settings', order: 20, path: '/settings', resourceRefId: 'settings-page' },
      { icon: 'fa-home', label: 'Home', order: 10, path: '/home', resourceRefId: 'home-page' },
    ]
    const { entries, routes } = buildNavModel(items, resourcesRefs)

    expect(entries.map((entry) => entry.label)).toEqual(['Home', 'Settings'])
    expect(entries[0]).toEqual({ iconName: 'fa-home', key: '/home', label: 'Home' })
    expect(routes[0]).toEqual({ endpoint: '/call?resource=flexes&name=home', path: '/home', resourceRef: resourcesRefs.items[0], resourceRefId: 'home-page', title: 'Home' })
  })

  it('skips items missing a path (no path → neither route nor entry)', () => {
    const { entries, routes } = buildNavModel([{ label: 'Home', resourceRefId: 'home-page' }], resourcesRefs)
    expect(entries).toHaveLength(0)
    expect(routes).toHaveLength(0)
  })

  it('derives a flexes/page-<slug> endpoint when an item has no resourceRefId (convention)', () => {
    const { entries, routes } = buildNavModel([{ label: 'Marketplace', path: '/marketplace' }], { items: [] }, 'krateo-system')
    expect(entries.map((entry) => entry.label)).toEqual(['Marketplace'])
    expect(routes[0].endpoint).toBe('/call?resource=flexes&apiVersion=widgets.templates.krateo.io/v1beta1&name=page-marketplace&namespace=krateo-system')
  })

  it('registers a route-only (label-less, templated) item with a page-<slug> endpoint and no sidebar entry', () => {
    const { entries, routes } = buildNavModel([{ page: 'composition-detail', path: '/compositions/{namespace}/{name}' }], { items: [] }, 'krateo-system')
    expect(entries).toHaveLength(0)
    expect(routes).toHaveLength(1)
    expect(routes[0]).toMatchObject({
      endpoint: '/call?resource=flexes&apiVersion=widgets.templates.krateo.io/v1beta1&name=page-composition-detail&namespace=krateo-system',
      path: '/compositions/{namespace}/{name}',
      resourceRefId: '',
    })
  })

  it('prefers resourceRefId over the page-<slug> convention when both could apply', () => {
    const { routes } = buildNavModel([{ label: 'Home', path: '/home', resourceRefId: 'home-page' }], resourcesRefs, 'krateo-system')
    expect(routes[0].endpoint).toBe('/call?resource=flexes&name=home')
  })

  it('RBAC: hides a sidebar entry whose resourceRefId ref is allowed:false, keeps allowed ones (route still registered)', () => {
    const rbacRefs: ResourcesRefs = {
      items: [
        { allowed: true, id: 'home-page', path: '/call?resource=flexes&name=home', payload: {}, verb: 'GET' },
        { allowed: false, id: 'settings-page', path: '/call?resource=flexes&name=settings', payload: {}, verb: 'GET' },
      ],
    }
    const items = [
      { icon: 'fa-home', label: 'Home', order: 10, path: '/home', resourceRefId: 'home-page' },
      { icon: 'fa-gear', label: 'Settings', order: 20, path: '/settings', resourceRefId: 'settings-page' },
    ]
    const { entries, routes } = buildNavModel(items, rbacRefs)
    // denied 'Settings' entry is dropped from the sider; 'Home' stays
    expect(entries.map((entry) => entry.label)).toEqual(['Home'])
    // routes are NOT RBAC-filtered — the deep-link still resolves (page /call 403s at the content layer)
    expect(routes.map((route) => route.path)).toEqual(['/home', '/settings'])
  })

  it('RBAC fail-open: keeps entries with no resourceRefId (convention page) and refs snowplow did not return', () => {
    const { entries } = buildNavModel(
      [
        { label: 'Marketplace', order: 1, path: '/marketplace' }, // no resourceRefId → not gated
        { label: 'Ghost', order: 2, path: '/ghost', resourceRefId: 'missing' }, // ref absent → fail-open
      ],
      { items: [] },
      'krateo-system',
    )
    expect(entries.map((entry) => entry.label)).toEqual(['Marketplace', 'Ghost'])
  })
})
