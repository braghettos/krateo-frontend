import { describe, expect, it } from 'vitest'

import type { ResourcesRefs, Widget } from '../types/Widget'

import { buildRouteSpecs, extractLoaderItemPaths } from './routesModel'

/**
 * Inputs mirror the REAL Route CRs observed on the verification cluster
 * (demo-system): a static list route + a dynamic detail route. The detail
 * route is the exact regression case — deriving routes from the Menu nav model
 * dropped it (it is not a menu entry), which is why that earlier attempt was
 * reverted. buildRouteSpecs must preserve BOTH.
 */
const routeWidget = (
  path: string,
  resourceRefId: string,
  endpoint: string
): Widget => ({
  status: {
    actions: {},
    resourcesRefs: {
      items: [{ allowed: true, id: resourceRefId, path: endpoint, payload: {}, verb: 'GET' }],
    } as ResourcesRefs,
    widgetData: { path, resourceRefId },
  },
} as unknown as Widget)

const compositionsList = routeWidget(
  '/compositions/demo-system',
  'demo-system-compositions-page-datagrid',
  '/call?resource=datagrids&apiVersion=widgets.templates.krateo.io/v1beta1&name=demo-system-compositions-page-datagrid&namespace=demo-system'
)

const compositionDetail = routeWidget(
  '/compositions/demo-system/{kind}/{name}',
  'demo-system-composition-tablist',
  '/call?resource=tablists&apiVersion=widgets.templates.krateo.io/v1beta1&name={name}-composition-tablist&namespace=demo-system'
)

describe('routesModel.buildRouteSpecs', () => {
  it('builds the full route set including the dynamic detail route (regression gate)', () => {
    const specs = buildRouteSpecs([compositionsList, compositionDetail])

    expect(specs).toEqual([
      {
        endpoint: '/call?resource=datagrids&apiVersion=widgets.templates.krateo.io/v1beta1&name=demo-system-compositions-page-datagrid&namespace=demo-system',
        path: '/compositions/demo-system',
      },
      {
        endpoint: '/call?resource=tablists&apiVersion=widgets.templates.krateo.io/v1beta1&name={name}-composition-tablist&namespace=demo-system',
        path: '/compositions/demo-system/{kind}/{name}',
      },
    ])
  })

  it('skips a route whose resourceRefId does not resolve in its resourcesRefs', () => {
    const unresolved = routeWidget('/orphan', 'missing-id', '/call?resource=x')
    // overwrite the ref id so resourceRefId no longer matches any item
    const broken = {
      ...unresolved,
      status: {
        ...(unresolved.status as object),
        resourcesRefs: { items: [{ allowed: true, id: 'some-other-id', path: '/call?x', payload: {}, verb: 'GET' }] },
      },
    } as unknown as Widget
    expect(buildRouteSpecs([broken])).toEqual([])
  })

  it('skips routes missing path / resourceRefId / resourcesRefs and string-status widgets', () => {
    const noPath = { status: { actions: {}, resourcesRefs: { items: [] }, widgetData: { resourceRefId: 'x' } } } as unknown as Widget
    const noRef = { status: { actions: {}, resourcesRefs: { items: [] }, widgetData: { path: '/p' } } } as unknown as Widget
    const stringStatus = { status: 'Unauthorized' } as unknown as Widget
    expect(buildRouteSpecs([noPath, noRef, stringStatus, undefined])).toEqual([])
  })
})

describe('routesModel.extractLoaderItemPaths', () => {
  it('returns each resolved RoutesLoader item path', () => {
    const loader = {
      status: {
        actions: {},
        resourcesRefs: {
          items: [
            { allowed: true, id: 'demo-system_demo-system-compositions-route', path: '/call?resource=routes&name=demo-system-compositions-route&namespace=demo-system', payload: {}, verb: 'GET' },
            { allowed: true, id: 'demo-system_demo-system-composition-route', path: '/call?resource=routes&name=demo-system-composition-route&namespace=demo-system', payload: {}, verb: 'GET' },
          ],
        },
        widgetData: { allowedResources: ['routes'] },
      },
    } as unknown as Widget

    expect(extractLoaderItemPaths(loader)).toEqual([
      '/call?resource=routes&name=demo-system-compositions-route&namespace=demo-system',
      '/call?resource=routes&name=demo-system-composition-route&namespace=demo-system',
    ])
  })

  it('returns [] for string status, missing items, or undefined loader', () => {
    expect(extractLoaderItemPaths({ status: 'error' } as unknown as Widget)).toEqual([])
    expect(extractLoaderItemPaths({ status: { actions: {}, widgetData: {} } } as unknown as Widget)).toEqual([])
    expect(extractLoaderItemPaths(undefined)).toEqual([])
  })
})
