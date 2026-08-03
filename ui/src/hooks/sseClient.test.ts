import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { __resetSseConnections, subscribeSse } from './sseClient'

class FakeEventSource {
  static instances: FakeEventSource[] = []
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  listeners: Record<string, ((event: { data: string }) => void)[]> = {}
  closed = false
  constructor(public url: string) { FakeEventSource.instances.push(this) }
  addEventListener(type: string, listener: (event: { data: string }) => void) { (this.listeners[type] ??= []).push(listener) }
  emit(type: string, data: unknown) { (this.listeners[type] ?? []).forEach((listener) => { listener({ data: JSON.stringify(data) }) }) }
  open() { this.onopen?.() }
  fail() { this.onerror?.() }
  close() { this.closed = true }
}

const noop = () => undefined

describe('sseClient — shared, ref-counted SSE', () => {
  beforeEach(() => { vi.stubGlobal('EventSource', FakeEventSource) })
  afterEach(() => {
    __resetSseConnections()
    FakeEventSource.instances = []
    vi.unstubAllGlobals()
  })

  it('shares ONE connection across subscribers to the same url', () => {
    subscribeSse('u', 't', { onMessage: noop })
    subscribeSse('u', 't', { onMessage: noop })
    expect(FakeEventSource.instances).toHaveLength(1)
  })

  it('opens a separate connection per distinct url', () => {
    subscribeSse('u1', 't', { onMessage: noop })
    subscribeSse('u2', 't', { onMessage: noop })
    expect(FakeEventSource.instances).toHaveLength(2)
  })

  it('fans a message out to every subscriber on that topic', () => {
    const recvA: string[] = []
    const recvB: string[] = []
    subscribeSse('u', 't', { onMessage: (data) => recvA.push(data) })
    subscribeSse('u', 't', { onMessage: (data) => recvB.push(data) })
    FakeEventSource.instances[0]?.emit('t', { x: 1 })
    expect(recvA).toEqual(['{"x":1}'])
    expect(recvB).toEqual(['{"x":1}'])
  })

  it('routes messages by topic (a topic only reaches its own subscribers)', () => {
    const recvA: string[] = []
    const recvB: string[] = []
    subscribeSse('u', 'topicA', { onMessage: (data) => recvA.push(data) })
    subscribeSse('u', 'topicB', { onMessage: (data) => recvB.push(data) })
    FakeEventSource.instances[0]?.emit('topicA', { v: 'a' })
    expect(recvA).toEqual(['{"v":"a"}'])
    expect(recvB).toEqual([])
  })

  it('fans onOpen out to all subscribers on the connection', () => {
    let opened = 0
    subscribeSse('u', 't1', { onMessage: noop, onOpen: () => { opened += 1 } })
    subscribeSse('u', 't2', { onMessage: noop, onOpen: () => { opened += 1 } })
    FakeEventSource.instances[0]?.open()
    expect(opened).toBe(2)
  })

  it('fans onError out and tears the connection down; a later subscribe reopens', () => {
    let errors = 0
    subscribeSse('u', 't', { onError: () => { errors += 1 }, onMessage: noop })
    FakeEventSource.instances[0]?.fail()
    expect(errors).toBe(1)
    expect(FakeEventSource.instances[0]?.closed).toBe(true)

    subscribeSse('u', 't', { onMessage: noop })
    expect(FakeEventSource.instances).toHaveLength(2)
  })

  it('stops delivery after unsubscribe (and unsubscribe is idempotent)', () => {
    const seen: string[] = []
    const unsubscribe = subscribeSse('u', 't', { onMessage: (data) => seen.push(data) })
    unsubscribe()
    unsubscribe()
    FakeEventSource.instances[0]?.emit('t', { x: 1 })
    expect(seen).toEqual([])
  })

  it('closes the connection only when the last subscriber leaves (ref counting)', () => {
    const u1 = subscribeSse('u', 't', { onMessage: noop })
    const u2 = subscribeSse('u', 't', { onMessage: noop })
    const [es] = FakeEventSource.instances
    u1()
    expect(es?.closed).toBe(false)
    u2()
    expect(es?.closed).toBe(true)
  })
})
