/**
 * Precise live-refresh matching.
 *
 * A widget DECLARES `watch` — the involvedObject(s) it is tied to — and a k8s
 * event refreshes that widget only when the event's `involvedObject` matches one
 * of them. The SSE event carries a k8s ObjectReference (GVK + name/namespace/uid,
 * NOT the resource plural), so a matcher keys on `apiVersion` + `kind`:
 *   - no `name`  → any object of that kind ("GVR-level" — for lists/aggregates)
 *   - `namespace` → scope to a namespace
 *   - `name`     → one specific object (for detail widgets)
 * `watch` is a list, so a widget can be tied to several objects/kinds at once.
 */

/** A single watch matcher declared on a widget (a subset of a k8s ObjectReference). */
export interface WatchMatcher {
  /** group/version, e.g. `composition.krateo.io/v1alpha1`. */
  apiVersion: string
  /** e.g. `DemoClaim`. */
  kind: string
  /** Scope to a namespace; omit to match any. */
  namespace?: string
  /** A specific object; omit to match any object of this kind. */
  name?: string
}

/** The `involvedObject` of a k8s event (the only addressing info the SSE stream carries). */
export interface InvolvedObject {
  apiVersion?: string
  kind?: string
  namespace?: string
  name?: string
  uid?: string
}

/**
 * True iff the event's involvedObject matches ANY of the widget's watch matchers.
 * GVK must match; `namespace`/`name` constrain only when the matcher specifies them.
 */
export const involvedObjectMatchesWatch = (involved: InvolvedObject, watch: readonly WatchMatcher[]): boolean =>
  watch.some((matcher) =>
    involved.apiVersion === matcher.apiVersion
    && involved.kind === matcher.kind
    && (matcher.namespace === undefined || matcher.namespace === involved.namespace)
    && (matcher.name === undefined || matcher.name === involved.name))

/** Default per-widget refresh window: at most ~1 refetch per this interval under a storm. */
export const LIVE_REFRESH_WINDOW_MS = 5000

interface Registration {
  watch: readonly WatchMatcher[]
  invalidate: () => unknown
  timer: ReturnType<typeof setTimeout> | undefined
  pending: boolean
}

/**
 * Routes k8s events to the widgets whose declared `watch` matches, invalidating
 * each matching widget — but throttled PER WIDGET: a leading refresh fires
 * immediately, then further events for that widget within the window coalesce to
 * a single trailing refresh. So an event storm for a watched resource caps that
 * widget at ~1 refetch/window (your "continuous refreshing" concern), and widgets
 * that don't watch the resource never wake at all.
 */
export class LiveRefreshRegistry {
  private readonly registrations = new Set<Registration>()

  constructor(private readonly windowMs: number = LIVE_REFRESH_WINDOW_MS) {}

  /** Register a widget's watch + its invalidate callback; returns an unregister fn. */
  register(watch: readonly WatchMatcher[], invalidate: () => unknown): () => void {
    const registration: Registration = { invalidate, pending: false, timer: undefined, watch }
    this.registrations.add(registration)

    return () => {
      if (registration.timer) {
        clearTimeout(registration.timer)
        registration.timer = undefined
      }
      this.registrations.delete(registration)
    }
  }

  /** Route one event's involvedObject to every registration whose watch matches. */
  handleEvent(involved: InvolvedObject): void {
    this.registrations.forEach((registration) => {
      if (involvedObjectMatchesWatch(involved, registration.watch)) {
        this.schedule(registration)
      }
    })
  }

  private schedule(registration: Registration): void {
    if (registration.timer) {
      // already refreshed this window — coalesce into a single trailing refresh
      registration.pending = true

      return
    }

    // leading edge: refresh immediately, then suppress for the window
    registration.invalidate()
    registration.timer = setTimeout(() => {
      registration.timer = undefined
      if (registration.pending) {
        registration.pending = false
        registration.invalidate()
      }
    }, this.windowMs)
  }
}

/** App-wide registry instance; the firehose feeds it and widgets register against it. */
export const liveRefreshRegistry = new LiveRefreshRegistry()
