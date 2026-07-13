/**
 * useHandleAction — pure-logic coverage for the action-dispatch core.
 *
 * SCOPE: like useWidgetQuery.test.ts, we do NOT render the hook (no RTL / jsdom).
 * Instead we test the pure, dependency-injected helpers the dispatcher is built
 * from — which is where the bug-prone logic actually lives:
 *   - buildPayload       the payload merge → override precedence (the create-form
 *                        metadata.name finding: payloadToOverride must win)
 *   - updateNameNamespace the DELETE/name-namespace query-param rewrite
 *   - interpolateRedirectUrl the ${path} redirect interpolation
 *   - parseJsonResponse  the empty/204-body guard (a successful DELETE must not error)
 *   - fetchWithTimeout   the abort-based request timeout
 */
/* eslint-disable no-template-curly-in-string -- these tests intentionally use literal ${...} (the jq-override / redirect DSL). */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ResourcesRefs, WidgetAction } from '../types/Widget'

import {
  buildPayload,
  dispatchAction,
  fetchWithTimeout,
  interpolateRedirectUrl,
  parseJsonResponse,
  updateNameNamespace,
  type ActionContext,
} from './useHandleActions'

type RestAction = WidgetAction & { type: 'rest' }

// Minimal valid rest action; tests override payload / payloadToOverride.
const restAction = (over: Partial<RestAction> = {}): RestAction => ({
  headers: [],
  id: 'a1',
  resourceRefId: 'ref',
  type: 'rest',
  ...over,
} as RestAction)

// resolveJq stub: by default echoes a marker so we can see if/when it was called.
const makeResolveJq = (impl?: (expr: string, vals: Record<string, unknown>) => string) =>
  vi.fn((expr: string, vals: Record<string, unknown>): Promise<string> =>
    Promise.resolve(impl ? impl(expr, vals) : `jq(${expr})`))

describe('buildPayload', () => {
  it('merges the action payload and the referenced resource payload', async () => {
    const resolveJq = makeResolveJq()
    const out = await buildPayload(restAction({ payload: { a: 1 } }), { b: 2 }, undefined, resolveJq)
    expect(out).toEqual({ a: 1, b: 2 })
    expect(resolveJq).not.toHaveBeenCalled()
  })

  it('lets the resource payload win over the action payload on conflict', async () => {
    const out = await buildPayload(restAction({ payload: { x: 1, y: 1 } }), { x: 2 }, undefined, makeResolveJq())
    expect(out).toEqual({ x: 2, y: 1 })
  })

  it('payloadToOverride sets a deep path and WINS over the merged value (create-form metadata.name)', async () => {
    // The served resource ref carries an empty metadata.name; the override must replace it.
    const out = await buildPayload(
      restAction({ payloadToOverride: [{ name: 'metadata.name', value: 'real-name' }] }),
      { metadata: { name: '' } },
      { /* customPayload present so overrides apply */ },
      makeResolveJq()
    )
    expect((out as { metadata: { name: string } }).metadata.name).toBe('real-name')
  })

  it('resolves ${...} override values via resolveJq with the customPayload under json', async () => {
    const customPayload = { size: 'large' }
    const resolveJq = makeResolveJq((_e, vals) => (vals.json as { size: string }).size)
    const out = await buildPayload(
      restAction({ payloadToOverride: [{ name: 'spec.size', value: '${.json.size}' }] }),
      {},
      customPayload,
      resolveJq
    )
    expect((out as { spec: { size: string } }).spec.size).toBe('large')
    expect(resolveJq).toHaveBeenCalledWith('${.json.size}', { json: customPayload })
  })

  it('uses literal (non-${) override values as-is without calling resolveJq', async () => {
    const resolveJq = makeResolveJq()
    const out = await buildPayload(
      restAction({ payloadToOverride: [{ name: 'spec.x', value: 'literal' }] }),
      {},
      {},
      resolveJq
    )
    expect((out as { spec: { x: string } }).spec.x).toBe('literal')
    expect(resolveJq).not.toHaveBeenCalled()
  })

  it('skips overrides entirely when customPayload is absent', async () => {
    const resolveJq = makeResolveJq()
    const out = await buildPayload(
      restAction({ payload: { keep: 1 }, payloadToOverride: [{ name: 'metadata.name', value: 'x' }] }),
      {},
      undefined,
      resolveJq
    )
    expect(out).toEqual({ keep: 1 })
    expect(resolveJq).not.toHaveBeenCalled()
  })
})

describe('updateNameNamespace', () => {
  it('appends name & namespace to a path with no query string', () => {
    expect(updateNameNamespace('/api', 'n', 'ns')).toBe('/api?name=n&namespace=ns')
  })

  it('preserves unrelated existing query params', () => {
    expect(updateNameNamespace('/api?foo=bar', 'n', 'ns')).toBe('/api?foo=bar&name=n&namespace=ns')
  })

  it('replaces any existing name / namespace params', () => {
    expect(updateNameNamespace('/api?name=old&keep=1&namespace=oldns', 'n', 'ns')).toBe('/api?keep=1&name=n&namespace=ns')
  })
})

describe('interpolateRedirectUrl', () => {
  it('interpolates a nested ${path} placeholder', () => {
    expect(interpolateRedirectUrl({ user: { id: 123 } }, '/profile/${user.id}')).toBe('/profile/123')
  })

  it('returns the route unchanged when there are no placeholders', () => {
    expect(interpolateRedirectUrl({}, '/static/route')).toBe('/static/route')
  })

  it('returns null when a placeholder cannot be resolved', () => {
    expect(interpolateRedirectUrl({}, '/p/${missing.key}')).toBeNull()
  })

  it('returns null when a placeholder resolves to a non-primitive', () => {
    expect(interpolateRedirectUrl({ user: { id: {} } }, '/p/${user.id}')).toBeNull()
  })
})

describe('parseJsonResponse (empty/204 guard — successful DELETE must not error)', () => {
  it('returns {} for an empty body', () => {
    expect(parseJsonResponse('')).toEqual({})
  })

  it('returns {} for a whitespace-only body', () => {
    expect(parseJsonResponse('   \n')).toEqual({})
  })

  it('parses a non-empty JSON body', () => {
    expect(parseJsonResponse('{"metadata":{"name":"foo"}}')).toEqual({ metadata: { name: 'foo' } })
  })
})

describe('fetchWithTimeout', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('resolves with the response and passes an abort signal to fetch', async () => {
    const fakeRes = { ok: true } as Response
    const fetchMock = vi.fn((_input: string, _init?: RequestInit) => Promise.resolve(fakeRes))
    vi.stubGlobal('fetch', fetchMock)

    const res = await fetchWithTimeout('/x', { method: 'GET' }, 1000)

    expect(res).toBe(fakeRes)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/x')
  })

  it('aborts the request once the timeout elapses (no native fetch timeout)', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      signal = init.signal ?? undefined
      init.signal?.addEventListener('abort', () => {
        const err = new Error('aborted')
        err.name = 'AbortError'
        reject(err)
      })
    }))
    vi.stubGlobal('fetch', fetchMock)

    const pending = fetchWithTimeout('/x', {}, 5000)
    const rejection = expect(pending).rejects.toThrow('aborted')

    expect(signal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(5000)

    await rejection
    expect(signal?.aborted).toBe(true)
  })
})

// A fully-mocked ActionContext so the (formerly React-bound) dispatcher is unit-testable.
const makeCtx = (over: Partial<ActionContext> = {}): ActionContext => ({
  apiBaseUrl: 'http://sp',
  closeDrawer: vi.fn(),
  confirm: vi.fn(() => Promise.resolve(true)),
  eventsBaseUrl: 'http://ev',
  getAccessToken: vi.fn(() => 'tok'),
  invalidateQueries: vi.fn(() => Promise.resolve()),
  message: { destroy: vi.fn(), loading: vi.fn() } as unknown as ActionContext['message'],
  navigate: vi.fn(),
  notification: { error: vi.fn(), success: vi.fn() } as unknown as ActionContext['notification'],
  openDrawer: vi.fn(),
  openModal: vi.fn(),
  provenanceEnabled: false,
  registerCleanup: vi.fn(),
  reloadRoutes: vi.fn(),
  resolveJq: vi.fn((expr: string) => Promise.resolve(`jq:${expr}`)),
  setLoading: vi.fn(),
  ...over,
})

const refs = (items: ResourcesRefs['items']): ResourcesRefs => ({ items })
const postRef = { allowed: true, id: 'ref', path: '/api/x', payload: {}, verb: 'POST' as const }
const fakeResponse = (ok: boolean, body: string): Response =>
  ({ ok, text: () => Promise.resolve(body) } as unknown as Response)

describe('dispatchAction — routing + non-SSE rest paths', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('navigate: navigates to the literal path', async () => {
    const ctx = makeCtx()
    await dispatchAction({ id: 'n', path: '/go', type: 'navigate' } as WidgetAction, { resourcesRefs: refs([]) }, ctx)
    expect(ctx.navigate).toHaveBeenCalledWith('/go')
  })

  it('navigate: a ${...} path is resolved via jq before navigating', async () => {
    const ctx = makeCtx({ resolveJq: vi.fn(() => Promise.resolve('/resolved')) })
    await dispatchAction({ id: 'n', path: '${.widget}', type: 'navigate' } as WidgetAction, { resourcesRefs: refs([]) }, ctx)
    expect(ctx.navigate).toHaveBeenCalledWith('/resolved')
  })

  it('navigate: errors when no path is given (no widgetEndpoint bypass)', async () => {
    const ctx = makeCtx()
    await dispatchAction({ id: 'n', type: 'navigate' } as WidgetAction, { resourcesRefs: refs([]) }, ctx)
    expect(ctx.navigate).not.toHaveBeenCalled()
    expect(ctx.notification.error).toHaveBeenCalledTimes(1)
  })

  it('navigate: declined confirmation does not navigate', async () => {
    const ctx = makeCtx({ confirm: vi.fn(() => Promise.resolve(false)) })
    await dispatchAction({ id: 'n', path: '/go', requireConfirmation: true, type: 'navigate' } as WidgetAction, { resourcesRefs: refs([]) }, ctx)
    expect(ctx.navigate).not.toHaveBeenCalled()
  })

  it('errors when the action references a resourceRef that is not present', async () => {
    const ctx = makeCtx()
    await dispatchAction({ headers: [], id: 'a', resourceRefId: 'missing', type: 'rest' } as WidgetAction, { resourcesRefs: refs([]) }, ctx)
    expect(ctx.notification.error).toHaveBeenCalledTimes(1)
  })

  it('openDrawer: opens with the resource ref path as the widget endpoint', async () => {
    const ctx = makeCtx()
    await dispatchAction(
      { id: 'd', resourceRefId: 'ref', type: 'openDrawer' } as WidgetAction,
      { resourcesRefs: refs([{ allowed: true, id: 'ref', path: '/api/drawer', payload: {}, verb: 'GET' }]) },
      ctx
    )
    expect(ctx.openDrawer).toHaveBeenCalledWith(expect.objectContaining({ widgetEndpoint: '/api/drawer' }))
  })

  it('rest POST: success → success toast + query invalidation', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(fakeResponse(true, '{"metadata":{"name":"n","namespace":"ns"},"message":"ok"}'))))
    const ctx = makeCtx()
    await dispatchAction(
      { headers: [], id: 'a', resourceRefId: 'ref', type: 'rest' } as WidgetAction,
      { resourcesRefs: refs([postRef]) },
      ctx
    )
    expect(ctx.notification.success).toHaveBeenCalledTimes(1)
    expect(ctx.invalidateQueries).toHaveBeenCalledTimes(1)
    expect(ctx.notification.error).not.toHaveBeenCalled()
  })

  it('rest DELETE: empty 204 body succeeds (no false error)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(fakeResponse(true, ''))))
    const ctx = makeCtx()
    await dispatchAction(
      { headers: [], id: 'a', resourceRefId: 'ref', type: 'rest' } as WidgetAction,
      { resourcesRefs: refs([{ allowed: true, id: 'ref', path: '/api/x', payload: {}, verb: 'DELETE' }]) },
      ctx
    )
    expect(ctx.notification.success).toHaveBeenCalledTimes(1)
    expect(ctx.notification.error).not.toHaveBeenCalled()
  })

  it('rest: a non-ok response surfaces an error toast', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(fakeResponse(false, '{"status":404,"reason":"NotFound","message":"nope"}'))))
    const ctx = makeCtx()
    await dispatchAction(
      { headers: [], id: 'a', resourceRefId: 'ref', type: 'rest' } as WidgetAction,
      { resourcesRefs: refs([postRef]) },
      ctx
    )
    expect(ctx.notification.error).toHaveBeenCalledTimes(1)
    expect(ctx.invalidateQueries).not.toHaveBeenCalled()
  })

  it('rest: declined confirmation never issues the request', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(fakeResponse(true, '{}')))
    vi.stubGlobal('fetch', fetchMock)
    const ctx = makeCtx({ confirm: vi.fn(() => Promise.resolve(false)) })
    await dispatchAction(
      { headers: [], id: 'a', requireConfirmation: true, resourceRefId: 'ref', type: 'rest' } as WidgetAction,
      { resourcesRefs: refs([postRef]) },
      ctx
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(ctx.notification.success).not.toHaveBeenCalled()
  })

  it('routes unexpected handler errors to an error toast', async () => {
    const ctx = makeCtx({ getAccessToken: vi.fn(() => { throw new Error('boom') }) })
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(fakeResponse(true, '{}'))))
    await dispatchAction(
      { headers: [], id: 'a', resourceRefId: 'ref', type: 'rest' } as WidgetAction,
      { resourcesRefs: refs([postRef]) },
      ctx
    )
    expect(ctx.notification.error).toHaveBeenCalledTimes(1)
  })
})

// Controllable EventSource for the onEventNavigateTo (SSE) path.
class FakeEventSource {
  static instances: FakeEventSource[] = []
  listeners: Record<string, ((event: { data: string }) => void)[]> = {}
  closed = false
  constructor(public url: string) { FakeEventSource.instances.push(this) }
  addEventListener(type: string, listener: (event: { data: string }) => void) { (this.listeners[type] ??= []).push(listener) }
  emit(type: string, data: unknown) { (this.listeners[type] ?? []).forEach((listener) => { listener({ data: JSON.stringify(data) }) }) }
  close() { this.closed = true }
}

const flush = () => new Promise((resolve) => { setTimeout(resolve, 0) })

const restOnEvent = (): WidgetAction => ({
  headers: [],
  id: 'a',
  onEventNavigateTo: { eventReason: 'Ready', url: '/done' },
  resourceRefId: 'ref',
  type: 'rest',
} as WidgetAction)

describe('dispatchAction — onEventNavigateTo (SSE) race + cleanup', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    FakeEventSource.instances = []
  })

  it('(3) replays an event that arrived before the POST response set resourceUid', async () => {
    vi.stubGlobal('EventSource', FakeEventSource)
    let resolveFetch: (r: Response) => void = () => undefined
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => { resolveFetch = resolve })))

    const ctx = makeCtx()
    const pending = dispatchAction(restOnEvent(), { resourcesRefs: refs([postRef]) }, ctx)

    // let runRest reach the fetch await (EventSource created + listener registered)
    await flush()
    const es = FakeEventSource.instances.at(-1)
    expect(es).toBeDefined()

    // event arrives FIRST — it must be buffered, not dropped
    es?.emit('krateo', { involvedObject: { uid: 'U123' }, reason: 'Ready' })
    expect(ctx.navigate).not.toHaveBeenCalled()

    // the response lands and sets resourceUid → the buffered event replays
    resolveFetch(fakeResponse(true, '{"metadata":{"uid":"U123"}}'))
    await pending
    await flush()

    expect(ctx.navigate).toHaveBeenCalledWith('/done')
    expect(ctx.notification.error).not.toHaveBeenCalled()
  })

  it('(7) registers a cleanup that closes the EventSource (unmount safety)', async () => {
    vi.stubGlobal('EventSource', FakeEventSource)
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(fakeResponse(true, '{"metadata":{"uid":"U"}}'))))

    let captured: (() => void) | undefined
    const ctx = makeCtx({ registerCleanup: (fn) => { captured = fn } })

    await dispatchAction(restOnEvent(), { resourcesRefs: refs([postRef]) }, ctx)

    const es = FakeEventSource.instances.at(-1)
    // still open, awaiting the event
    expect(es?.closed).toBe(false)
    expect(captured).toBeDefined()

    // simulate the hook's unmount teardown
    captured?.()
    expect(es?.closed).toBe(true)
  })
})
