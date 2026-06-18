import { afterEach, describe, expect, it, vi } from 'vitest'

import { involvedObjectMatchesWatch, LiveRefreshRegistry, type InvolvedObject, type WatchMatcher } from './liveRefresh'

// The real cdn-edge DemoClaim event from the SSE stream.
const cdnEdge: InvolvedObject = {
  apiVersion: 'composition.krateo.io/v1alpha1',
  kind: 'DemoClaim',
  name: 'cdn-edge',
  namespace: 'krateo-system',
  uid: 'c04983bc-468b-4e51-8639-06865fad71a0',
}

describe('involvedObjectMatchesWatch', () => {
  it('kind-level watch (no name) matches any object of that GVK — list/aggregate widgets', () => {
    const watch: WatchMatcher[] = [{ apiVersion: 'composition.krateo.io/v1alpha1', kind: 'DemoClaim' }]
    expect(involvedObjectMatchesWatch(cdnEdge, watch)).toBe(true)
    expect(involvedObjectMatchesWatch({ ...cdnEdge, name: 'postgres-prod-eu' }, watch)).toBe(true)
  })

  it('does not match a different kind or apiVersion', () => {
    expect(involvedObjectMatchesWatch(cdnEdge, [{ apiVersion: 'composition.krateo.io/v1alpha1', kind: 'Rancherinstaller' }])).toBe(false)
    expect(involvedObjectMatchesWatch(cdnEdge, [{ apiVersion: 'composition.krateo.io/v0-1-0', kind: 'DemoClaim' }])).toBe(false)
  })

  it('namespace-scoped watch matches only in that namespace', () => {
    const watch: WatchMatcher[] = [{ apiVersion: 'composition.krateo.io/v1alpha1', kind: 'DemoClaim', namespace: 'krateo-system' }]
    expect(involvedObjectMatchesWatch(cdnEdge, watch)).toBe(true)
    expect(involvedObjectMatchesWatch({ ...cdnEdge, namespace: 'other' }, watch)).toBe(false)
  })

  it('object-level watch (name set) matches only that object — detail widgets', () => {
    const watch: WatchMatcher[] = [{ apiVersion: 'composition.krateo.io/v1alpha1', kind: 'DemoClaim', name: 'cdn-edge', namespace: 'krateo-system' }]
    expect(involvedObjectMatchesWatch(cdnEdge, watch)).toBe(true)
    expect(involvedObjectMatchesWatch({ ...cdnEdge, name: 'cloudsql-legacy' }, watch)).toBe(false)
  })

  it('a list of matchers matches if ANY matches', () => {
    const watch: WatchMatcher[] = [
      { apiVersion: 'composition.krateo.io/v0-1-0', kind: 'Rancherinstaller' },
      { apiVersion: 'composition.krateo.io/v1alpha1', kind: 'DemoClaim', name: 'cdn-edge' },
    ]
    expect(involvedObjectMatchesWatch(cdnEdge, watch)).toBe(true)
  })

  it('an empty watch list never matches (inert widget)', () => {
    expect(involvedObjectMatchesWatch(cdnEdge, [])).toBe(false)
  })
})

describe('LiveRefreshRegistry', () => {
  const demoClaim: WatchMatcher = { apiVersion: 'composition.krateo.io/v1alpha1', kind: 'DemoClaim' }

  afterEach(() => { vi.useRealTimers() })

  it('invalidates a widget whose watch matches the event (leading edge, immediate)', () => {
    const registry = new LiveRefreshRegistry()
    const invalidate = vi.fn()
    registry.register([demoClaim], invalidate)
    registry.handleEvent(cdnEdge)
    expect(invalidate).toHaveBeenCalledTimes(1)
  })

  it('ignores events the widget does not watch', () => {
    const registry = new LiveRefreshRegistry()
    const invalidate = vi.fn()
    registry.register([{ apiVersion: 'composition.krateo.io/v0-1-0', kind: 'Rancherinstaller' }], invalidate)
    registry.handleEvent(cdnEdge)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('stops invalidating after unregister', () => {
    const registry = new LiveRefreshRegistry()
    const invalidate = vi.fn()
    const unregister = registry.register([demoClaim], invalidate)
    unregister()
    registry.handleEvent(cdnEdge)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('throttles a storm to one leading + one trailing refresh per window', () => {
    vi.useFakeTimers()
    const registry = new LiveRefreshRegistry(5000)
    const invalidate = vi.fn()
    registry.register([demoClaim], invalidate)

    // a storm of 50 events for the watched resource
    Array.from({ length: 50 }).forEach(() => registry.handleEvent(cdnEdge))
    // leading edge only, so far
    expect(invalidate).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(5000)
    // one coalesced trailing refresh
    expect(invalidate).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(5000)
    // quiet afterwards — no further work
    expect(invalidate).toHaveBeenCalledTimes(2)
  })

  it('routes one event to every matching widget', () => {
    const registry = new LiveRefreshRegistry()
    const invalidateA = vi.fn()
    const invalidateB = vi.fn()
    registry.register([demoClaim], invalidateA)
    registry.register([{ ...demoClaim, name: 'cdn-edge', namespace: 'krateo-system' }], invalidateB)
    registry.handleEvent(cdnEdge)
    expect(invalidateA).toHaveBeenCalledTimes(1)
    expect(invalidateB).toHaveBeenCalledTimes(1)
  })
})
