/* eslint-disable sort-keys/sort-keys-fix */
/* Coordinate/object key order mirrors the snowplow protocol doc, not alphabetical. */

/**
 * Per-widget live-refresh over snowplow's `/refreshes` SSE stream.
 *
 * Snowplow's live-refresh-coherence layer (1.5.x, default-ON when the cache is
 * on) pushes a one-line *signal* — never data — when a cluster object behind a
 * widget changes: `event: refresh\ndata: <l1Key>`. The browser matches that key
 * to the widget(s) it rendered and re-issues the widget's normal `GET /call`,
 * which is a warm cache HIT carrying fresh, RBAC-correct content. This replaces
 * polling and the coarse k8s-event firehose (`useLiveWatch`) with a precise,
 * per-widget push.
 *
 * ── Why fetch-SSE + Bearer (not native EventSource) ──────────────────────────
 * The protocol doc's reference impl uses `new EventSource(url, {withCredentials:
 * true})` and a `krateo-session` cookie, because an `EventSource` cannot set the
 * `Authorization` header. The portal authenticates every snowplow call with a
 * Bearer token (`getAccessToken()`, see useWidgetQuery's `/call` fetch), NOT a
 * session cookie — so we take the doc's explicitly-sanctioned alternative
 * ("Non-browser clients … may instead send `Authorization: Bearer <jwt>`") and
 * stream via `fetch` + `ReadableStream`, mirroring the Autopilot transport
 * (components/Autopilot/transport.ts). Trade-off vs EventSource: fetch-SSE has no
 * built-in auto-reconnect, so we reconnect with capped backoff ourselves.
 *
 * ── Forgery-proof arming ─────────────────────────────────────────────────────
 * You DON'T subscribe by key (you can't forge another user's key). You send
 * *coordinates* (GVR + ns + name + page/extras + the class snowplow keyed the
 * response under) and snowplow re-derives the key under YOUR authenticated
 * identity. The class comes verbatim from the `X-Snowplow-Refresh-Class` response
 * header (widgets | widgetContent | restactions) — never guessed. You match
 * incoming events by the `X-Snowplow-Refresh-Key` response header. Both resolve
 * to the same `l1Key`.
 *
 * Gated behind a config feature flag (default OFF): a snowplow that predates the
 * `X-Snowplow-Refresh-Class` header (commit a945763) simply never stamps the
 * headers, so nothing arms — but we keep the flag off by default until the
 * deployed snowplow is confirmed to carry it.
 */

import type { Config } from '../context/ConfigContext'
import { getAccessToken } from '../utils/getAccessToken'

// ────────────────────────────────────────────────────────────────────────────
// Protocol types
// ────────────────────────────────────────────────────────────────────────────

/** The class snowplow keyed a `/call` response under (the `X-Snowplow-Refresh-Class` header). */
export type RefreshClass = 'widgets' | 'widgetContent' | 'restactions'

/** One widget's subscription coordinates — must match its `/call` exactly so the
 * derived key equals the key the event will carry. */
export interface RefreshCoords {
  class: RefreshClass
  group: string
  version: string
  resource: string
  namespace: string
  name: string
  page?: number
  perPage?: number
  extras?: Record<string, unknown>
}

export const REFRESH_HEADER_KEY = 'X-Snowplow-Refresh-Key'
export const REFRESH_HEADER_CLASS = 'X-Snowplow-Refresh-Class'

/** ≤512 widgets per connection, ≤16 KB decoded `sub` (snowplow returns 400 above either). */
const MAX_WIDGETS = 512
const MAX_SUB_BYTES = 16 * 1024
/** Per-widget refetch throttle: a `refresh` means "data changed, refetch when convenient". */
const REFRESH_THROTTLE_MS = 5000
/** Coalesce the burst of arm/disarm calls a page navigation produces into one reconnect. */
const RECONNECT_DEBOUNCE_MS = 200
/** Capped exponential backoff between fetch-SSE reconnect attempts. */
const RECONNECT_BACKOFF_BASE_MS = 1000
const RECONNECT_BACKOFF_MAX_MS = 30000

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers (exported for unit testing)
// ────────────────────────────────────────────────────────────────────────────

/** UTF-8-safe base64url (extras may carry a Unicode displayName, which `btoa` alone rejects). */
export const base64UrlEncode = (input: string): string => {
  const bytes = new TextEncoder().encode(input)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Pull complete SSE event blocks out of a rolling buffer, returning [events, remainder]. */
export const drainSseEvents = (buffer: string): { events: string[]; rest: string } => {
  const events: string[] = []
  let rest = buffer
  let boundary = rest.indexOf('\n\n')
  while (boundary !== -1) {
    events.push(rest.slice(0, boundary))
    rest = rest.slice(boundary + 2)
    boundary = rest.indexOf('\n\n')
  }
  return { events, rest }
}

/**
 * Parse one SSE event block into its `event:` name and joined `data:` payload.
 * Comment lines (`:` prefix, e.g. `: keepalive`) and unknown fields are ignored.
 */
export const parseSseBlock = (block: string): { event?: string; data?: string } => {
  let event: string | undefined
  const dataLines: string[] = []
  for (const line of block.split('\n')) {
    if (line.startsWith(':') || line.length === 0) { continue }
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''))
    }
  }
  return { event, data: dataLines.length ? dataLines.join('\n') : undefined }
}

const parseNumber = (raw: string | null): number | undefined => {
  if (raw === null) { return undefined }
  const parsed = parseInt(raw, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

/**
 * Build a widget's subscription coordinates from the `/call` query params it was
 * fetched with (`apiVersion=<group>/<version>`, `resource`, `name`, `namespace`,
 * `page`, `perPage`, `extras`). Returns null when the params can't form a valid
 * coordinate (so the widget simply isn't armed). `cls` is the verbatim
 * `X-Snowplow-Refresh-Class`.
 */
export const buildRefreshCoords = (params: URLSearchParams, cls: RefreshClass): RefreshCoords | null => {
  const apiVersion = params.get('apiVersion') ?? ''
  const resource = params.get('resource') ?? ''
  const name = params.get('name') ?? ''
  const namespace = params.get('namespace') ?? ''
  if (!apiVersion || !resource || !name) { return null }

  const slash = apiVersion.lastIndexOf('/')
  const group = slash >= 0 ? apiVersion.slice(0, slash) : ''
  const version = slash >= 0 ? apiVersion.slice(slash + 1) : apiVersion

  const coords: RefreshCoords = { class: cls, group, version, resource, namespace, name }

  const page = parseNumber(params.get('page'))
  if (page !== undefined) { coords.page = page }
  const perPage = parseNumber(params.get('perPage'))
  if (perPage !== undefined) { coords.perPage = perPage }

  const extrasRaw = params.get('extras')
  if (extrasRaw) {
    try { coords.extras = JSON.parse(extrasRaw) as Record<string, unknown> } catch { /* leave unset */ }
  }
  return coords
}

/**
 * Whether per-widget live-refresh is enabled. **ON by default** — every widget rendered via
 * WidgetRenderer (the single universal widget path) arms the tab's `/refreshes` stream.
 * Verified delivering end-to-end on snowplow ≥1.5.13; an older snowplow / cache-off / RBAC-skip
 * degrades to a harmless idle stream (keepalives only, zero events). An install opts OUT by
 * setting `config.api.WIDGET_LIVE_REFRESH_ENABLED: false`. Off until config loads (the arm hook
 * also no-ops without a base URL).
 */
export const isWidgetLiveRefreshEnabled = (config: Config | undefined): boolean => {
  if (!config) { return false }
  return config.api.WIDGET_LIVE_REFRESH_ENABLED !== false
}

// ────────────────────────────────────────────────────────────────────────────
// Header capture (written by useWidgetQuery's /call fetch, read by the arm hook)
// ────────────────────────────────────────────────────────────────────────────

/** A captured arm-target: the coords to subscribe with + the key events arrive under. */
export interface RefreshEntry {
  coords: RefreshCoords
  key: string
}

/**
 * widgetId (the serialized react-query key) → its latest RefreshEntry. Written
 * inside the widget's `/call` queryFn the moment the response resolves (so its
 * coords + key always match THAT response), read by the arm hook on the
 * re-render that the resolved query triggers. The stored object is replaced only
 * when the captured key changes, so the arm hook's `entry.key` effect-dep stays
 * referentially stable between identical fetches and doesn't churn the stream.
 */
const refreshEntries = new Map<string, RefreshEntry>()

/**
 * Record (or clear) a widget's refresh entry from a `/call` response.
 * `headers` is the `Response.headers`; absent class/key (cache-off, RBAC-skipped,
 * identity-less, or a pre-a945763 snowplow) → the entry is cleared (nothing to arm).
 */
export const recordRefreshHeaders = (widgetId: string, params: URLSearchParams, headers: Headers): void => {
  const cls = headers.get(REFRESH_HEADER_CLASS)
  const key = headers.get(REFRESH_HEADER_KEY)
  if (!cls || !key || (cls !== 'widgets' && cls !== 'widgetContent' && cls !== 'restactions')) {
    refreshEntries.delete(widgetId)
    return
  }
  const coords = buildRefreshCoords(params, cls)
  if (!coords) {
    refreshEntries.delete(widgetId)
    return
  }
  const prev = refreshEntries.get(widgetId)
  // Keep the same object reference when nothing changed, so the arm hook's
  // `entry.key` dependency doesn't re-fire on an identical refetch.
  if (prev && prev.key === key && JSON.stringify(prev.coords) === JSON.stringify(coords)) { return }
  refreshEntries.set(widgetId, { coords, key })
}

export const getRefreshEntry = (widgetId: string): RefreshEntry | undefined => refreshEntries.get(widgetId)

/** Test-only: drop all captured entries. */
export const __resetRefreshEntries = (): void => { refreshEntries.clear() }

// ────────────────────────────────────────────────────────────────────────────
// RefreshManager — one multiplexed /refreshes stream per tab
// ────────────────────────────────────────────────────────────────────────────

type Refetch = () => unknown

/**
 * Holds the set of armed widgets, opens ONE fetch-SSE `/refreshes` stream for the
 * whole tab (rebuilt, debounced, when the armed set changes), and on each
 * `refresh` event refetches the matching widget(s) — throttled per widget.
 *
 * Exported (not just the singleton) so tests can drive a fresh instance with an
 * injected clock and feed refresh keys directly via `dispatchRefresh`.
 */
export class RefreshManager {
  private readonly armed = new Map<string, RefreshCoords>()
  private readonly keyToWidgets = new Map<string, Set<string>>()
  private readonly refetchById = new Map<string, Refetch>()
  private readonly lastRefetch = new Map<string, number>()
  private baseUrl = ''
  private controller: AbortController | undefined
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private retryAttempt = 0

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** Point the manager at the snowplow base URL (idempotent; set on first arm). */
  configure(baseUrl: string): void { this.baseUrl = baseUrl }

  /**
   * Arm a widget: subscribe with its `coords`, route events carrying `refreshKey`
   * to `refetch`. Returns a disarm fn (call on unmount). Re-arming the same
   * widgetId replaces its coords/key.
   */
  arm(widgetId: string, coords: RefreshCoords, refreshKey: string, refetch: Refetch): () => void {
    this.removeFromKeyIndex(widgetId)
    this.armed.set(widgetId, coords)
    this.refetchById.set(widgetId, refetch)
    let set = this.keyToWidgets.get(refreshKey)
    if (!set) {
      set = new Set()
      this.keyToWidgets.set(refreshKey, set)
    }
    set.add(widgetId)
    this.scheduleReconnect()
    return () => this.disarm(widgetId)
  }

  private disarm(widgetId: string): void {
    this.armed.delete(widgetId)
    this.refetchById.delete(widgetId)
    this.lastRefetch.delete(widgetId)
    this.removeFromKeyIndex(widgetId)
    this.scheduleReconnect()
  }

  /**
   * Whether `widgetId` is currently armed on the `/refreshes` stream — i.e. it has
   * a live subscription (coords) that the tab's stream is (or will be) carrying.
   * Read-only view over the armed set; the FreshnessBadge's `liveArmed` prop reads
   * this to show the honest "Live" dot only once a push channel is actually open,
   * not merely that the last fetch succeeded.
   */
  isArmed(widgetId: string): boolean {
    return this.armed.has(widgetId)
  }

  private removeFromKeyIndex(widgetId: string): void {
    this.keyToWidgets.forEach((set, key) => {
      if (set.delete(widgetId) && set.size === 0) { this.keyToWidgets.delete(key) }
    })
  }

  /** Look up the widget(s) for an `l1Key` and refetch each, throttled per widget. */
  dispatchRefresh(l1Key: string): void {
    const widgets = this.keyToWidgets.get(l1Key)
    if (!widgets) { return }
    const now = this.now()
    widgets.forEach((widgetId) => {
      // Default to -Infinity (not 0) so a widget's FIRST refresh always fires the
      // leading edge regardless of the clock's absolute value.
      if (now - (this.lastRefetch.get(widgetId) ?? Number.NEGATIVE_INFINITY) < REFRESH_THROTTLE_MS) { return }
      this.lastRefetch.set(widgetId, now)
      this.refetchById.get(widgetId)?.()
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer) }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      this.connect()
    }, RECONNECT_DEBOUNCE_MS)
  }

  /** Build `?sub=` from the armed coords (capped) and (re)open the single stream. */
  private connect(): void {
    this.controller?.abort()
    this.controller = undefined
    this.clearRetryTimer()

    const coords = this.subCoords()
    if (coords.length === 0 || !this.baseUrl) { return }

    // No session → nothing to authorize; don't open a stream that would 401-loop.
    let token: string
    try {
      token = getAccessToken()
    } catch {
      return
    }
    if (!token) { return }

    const sub = base64UrlEncode(JSON.stringify(coords))
    const controller = new AbortController()
    this.controller = controller
    void this.stream(`${this.baseUrl}/refreshes?sub=${sub}`, token, controller)
  }

  /** The armed coords, capped to snowplow's limits (logging what was dropped). */
  private subCoords(): RefreshCoords[] {
    let coords = [...this.armed.values()]
    if (coords.length > MAX_WIDGETS) {
      console.warn(`[live-refresh] ${coords.length} widgets armed > ${MAX_WIDGETS} cap; dropping ${coords.length - MAX_WIDGETS} from the subscription`)
      coords = coords.slice(0, MAX_WIDGETS)
    }
    while (coords.length > 1 && JSON.stringify(coords).length > MAX_SUB_BYTES) {
      coords.pop()
    }
    return coords
  }

  private async stream(url: string, token: string, controller: AbortController): Promise<void> {
    let response: Response
    try {
      response = await fetch(url, {
        headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
    } catch {
      this.scheduleRetry(controller)
      return
    }
    if (!response.ok || !response.body) {
      this.scheduleRetry(controller)
      return
    }
    // Connected cleanly — reset the reconnect backoff.
    this.retryAttempt = 0

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      for (;;) {
        // eslint-disable-next-line no-await-in-loop -- sequential stream reads are inherent to SSE
        const { done, value } = await reader.read()
        if (done) { break }
        buffer += decoder.decode(value, { stream: true })
        const { events, rest } = drainSseEvents(buffer)
        buffer = rest
        events.forEach((block) => {
          const { data, event } = parseSseBlock(block)
          if (event === 'refresh' && data) { this.dispatchRefresh(data) }
        })
      }
    } catch { /* aborted or transport error — fall through to retry */ }
    // Stream closed (server idle-close / network). Reconnect unless we intentionally aborted.
    this.scheduleRetry(controller)
  }

  private scheduleRetry(controller: AbortController): void {
    // Only the current, non-aborted stream may schedule a reconnect.
    if (controller.signal.aborted || this.controller !== controller) { return }
    if (this.retryTimer) { return }
    const delay = Math.min(RECONNECT_BACKOFF_BASE_MS * 2 ** this.retryAttempt, RECONNECT_BACKOFF_MAX_MS)
    this.retryAttempt += 1
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined
      this.connect()
    }, delay)
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = undefined
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
  }

  /** Test-only: tear down timers + the stream and forget all state. */
  reset(): void {
    this.controller?.abort()
    this.controller = undefined
    this.clearReconnectTimer()
    this.clearRetryTimer()
    this.armed.clear()
    this.keyToWidgets.clear()
    this.refetchById.clear()
    this.lastRefetch.clear()
    this.retryAttempt = 0
  }
}

/** App-wide singleton: every widget arms against this one stream-per-tab. */
export const refreshManager = new RefreshManager()

/**
 * Whether the given widget currently has a live `/refreshes` subscription armed on
 * the tab-wide stream. A read-only check over the singleton's armed set — used by
 * WidgetRenderer to drive the FreshnessBadge's `liveArmed` prop so the green "Live"
 * dot only shows when a push channel is genuinely open for THAT widget (replacing
 * the render-local `isSuccess && !isStale` proxy). Off (false) whenever live-refresh
 * is disabled, the response wasn't cache-keyed, or the widget hasn't armed yet.
 */
export const isWidgetArmed = (widgetId: string): boolean => refreshManager.isArmed(widgetId)
