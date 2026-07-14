/**
 * In-place session-resume coordination (Wave-1 session honesty).
 *
 * Before this module, ANY 401 from a widget/API fetch funneled into `forceLogout` — a hard
 * client-session wipe + redirect to /login that dumped the user out of the app and discarded
 * all page/rail state. Now an expired token raises ONE app-level "Session expired" modal
 * (components/SessionResume) that re-authenticates IN PLACE via the same authn basic flow the
 * Login page uses, then invalidates the react-query cache so the page resumes where it was.
 *
 * This module is the fetch-layer-facing half: a tiny module-level store + window CustomEvent
 * (the `openDrawer` precedent — widgets/Drawer/Drawer.tsx) so ANY fetch layer can raise the
 * modal without prop drilling, and a burst of concurrent 401s (every widget on a page failing
 * at once) coalesces into a single pending resume with a single modal.
 *
 * Deliberate scope: only the BASIC auth strategy resumes in place (it is what Login.tsx
 * implements as a credentials form). When no basic strategy is available — or no modal surface
 * is mounted at all (401 outside the Shell) — the flow falls back to the legacy `forceLogout`
 * path, which preserves the current route via `/login?next=`.
 */

import { forceLogout } from './logout'

export type SessionResumeOutcome = 'resumed' | 'logout'

/** Window CustomEvent the app-level modal listens for (single mount in Shell, like Drawer). */
export const SESSION_RESUME_EVENT = 'openSessionResume'

type PendingResume = {
  promise: Promise<SessionResumeOutcome>
  resolve: (outcome: SessionResumeOutcome) => void
}

/** The one pending resume — concurrent 401s coalesce onto it (exactly one modal). */
let pending: PendingResume | null = null

/** How many modal surfaces are mounted (0 outside the Shell → legacy fallback). */
let surfaces = 0

/**
 * Called by the SessionResumeModal on mount so `raiseSessionExpired` knows an in-place
 * resume surface exists. Returns the unregister cleanup for the unmount effect.
 */
export const registerSessionResumeSurface = (): (() => void) => {
  surfaces += 1
  return () => { surfaces -= 1 }
}

/**
 * Whether a session-resume is currently pending (modal up, or legacy fallback in flight).
 * Error-toast layers (useCatchError) consult this to suppress the storm of secondary
 * failures that in-flight refetches keep producing while the token is stale.
 */
export const isSessionResumePending = (): boolean => pending !== null

/**
 * Resolve the pending resume (called by the modal after a successful re-auth, or when the
 * user chooses to log out / the modal falls back). Safe to call with none pending.
 */
export const settleSessionResume = (outcome: SessionResumeOutcome): void => {
  const settled = pending
  pending = null
  settled?.resolve(outcome)
}

/**
 * Raise the "session expired" flow for a 401. Idempotent under bursts: while a resume is
 * pending every additional call returns the SAME promise and dispatches no further event,
 * so exactly one modal is shown for any number of concurrent 401s.
 *
 * When no modal surface is mounted (or there is no window at all), falls back to the legacy
 * `forceLogout` path and resolves 'logout' — old behavior, documented scope.
 */
export const raiseSessionExpired = (): Promise<SessionResumeOutcome> => {
  if (pending) { return pending.promise }

  let resolve!: (outcome: SessionResumeOutcome) => void
  const promise = new Promise<SessionResumeOutcome>((res) => { resolve = res })
  pending = { promise, resolve }

  if (typeof window === 'undefined' || surfaces === 0) {
    // No in-place surface to resume on → legacy behavior (forceLogout preserves the
    // route via /login?next= and offers its own re-authenticate/logout prompt).
    void forceLogout()
    settleSessionResume('logout')
    return promise
  }

  window.dispatchEvent(new CustomEvent(SESSION_RESUME_EVENT))
  return promise
}

/** Test-only: reset the module-level store so each test starts clean. */
export const __resetSessionResume = (): void => {
  pending = null
  surfaces = 0
}
