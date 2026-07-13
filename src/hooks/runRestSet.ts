/**
 * runRestSet — the P1 "applySet" fabric: the ORDERED multi-object write capability that
 * replaces the vetoed snowplow /callset CLIENT-SIDE. HARD RULE honoured here: ZERO
 * snowplow changes — a set is N sequential calls to the EXISTING endpoint, each shaped
 * exactly like the single-write path `runRest` fires (same base URL, same Bearer auth).
 *
 * Semantics (the W0-4 contract):
 *   1. ONE aggregated set-level blast radius (buildBlastRadiusSet: total count + per-op
 *      verb/GVR/namespace/name + payload previews + per-op `irreversible` for DELETE)
 *      → ONE ctx.confirm for the WHOLE set. Decline = NOTHING dispatched (returns null).
 *   2. On confirm: ops dispatch SEQUENTIALLY in index order. STOP ON FIRST ERROR — an op
 *      after a failure is never attempted (no result entry for it).
 *   3. Returns per-item results [{index, ok, status, message}] for the ops that ran.
 *   4. Honest partial-state reporting: full success → one toast with the count; a failure
 *      → one toast naming EXACTLY which op failed, how many were already applied (they
 *      are NOT rolled back), and that the remaining ops were NOT executed.
 *
 * Sibling of `runRest` (useHandleActions.ts hosts every scalar run* handler; this set
 * fabric lives in its own module only for the max-lines budget). The two modules
 * reference each other at CALL TIME only, so the import cycle is inert under ESM.
 */

import { buildBlastRadiusSet, type WriteOp } from '../components/BlastRadius/buildBlastRadius'

import type { ActionContext } from './useHandleActions'
import { fetchWithTimeout, parseJsonResponse, POST_WRITE_REVALIDATE_DELAYS_MS } from './useHandleActions'

export type { WriteOp }

/** Per-item outcome of a set dispatch. `index` is the op's position in the ordered set. */
export interface WriteOpResult {
  index: number
  ok: boolean
  /** HTTP status of the response; 0 when the request itself failed (network error / timeout abort). */
  status: number
  message: string
}

/**
 * The slice of ActionContext the fabric needs (type-only — the hook passes its real ctx).
 * Keeping it a Pick documents the surface: the gate (confirm), the write path (base URL +
 * token), and the aftermath (notify + invalidate + unmount-safe revalidation timers).
 */
export type RunRestSetContext = Pick<
  ActionContext,
  'apiBaseUrl' | 'confirm' | 'getAccessToken' | 'invalidateQueries' | 'message' | 'notification' | 'registerCleanup' | 'setLoading'
>

/** The op's request Content-Type: merge-patch for PATCH (apiserver semantics), JSON otherwise. */
const contentTypeOf = (verb: WriteOp['verb']): string =>
  (verb === 'PATCH' ? 'application/merge-patch+json' : 'application/json')

/** Human identity of one op for the failure toast (e.g. "DELETE fireworksapps/my-app"). */
const opLabel = (op: { verb: string; gvr: { resource: string }; name?: string }): string =>
  `${op.verb} ${op.gvr.resource || 'object'}${op.name ? `/${op.name}` : ''}`

/** Dispatch ONE op through the same fetch path runRest uses; never throws (errors → result). */
const dispatchOp = async (op: WriteOp, index: number, ctx: RunRestSetContext): Promise<WriteOpResult> => {
  try {
    const res = await fetchWithTimeout(ctx.apiBaseUrl + op.path, {
      // Same body rule as runRest: only POST/PUT/PATCH carry one (DELETE never does).
      body: op.verb === 'DELETE' ? undefined : JSON.stringify(op.payload ?? {}),
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${ctx.getAccessToken()}`,
        'Content-Type': contentTypeOf(op.verb),
      },
      method: op.verb,
    })
    const body = parseJsonResponse(await res.text())
    return { index, message: body.message ?? (res.ok ? 'OK' : `HTTP ${res.status}`), ok: res.ok, status: res.status }
  } catch (error) {
    return { index, message: error instanceof Error ? error.message : String(error), ok: false, status: 0 }
  }
}

/**
 * Run an ORDERED write-set behind ONE aggregated W0-2 confirm. Returns null when the set
 * is empty or the human declines (nothing was dispatched); otherwise the per-item results
 * of the ops that ran (stop-on-first-error: a failed op is the last entry).
 */
export const runRestSet = async (ops: readonly WriteOp[], ctx: RunRestSetContext): Promise<WriteOpResult[] | null> => {
  if (ops.length === 0) {
    return null
  }

  // The W0-4 gate: ONE confirm for the WHOLE set. Decline → nothing is dispatched.
  const radius = buildBlastRadiusSet(ops)
  if (!(await ctx.confirm(radius))) {
    ctx.setLoading(false)

    return null
  }

  ctx.setLoading(true)
  const results: WriteOpResult[] = []
  try {
    for (const [index, op] of ops.entries()) {
      // eslint-disable-next-line no-await-in-loop -- ORDERED dispatch is the contract: op N+1 must not fire until op N succeeded
      const result = await dispatchOp(op, index, ctx)
      results.push(result)
      if (!result.ok) {
        break
      }
    }
  } finally {
    ctx.setLoading(false)
  }

  const failed = results.find((result) => !result.ok)
  ctx.message.destroy()
  if (!failed) {
    ctx.notification.success({
      description: `All ${ops.length} write${ops.length === 1 ? '' : 's'} applied in order.`,
      message: 'Write set applied',
      placement: 'bottomLeft',
    })
  } else {
    // Honest partial-state reporting: name the failed op, count what was already applied
    // (NOT rolled back), and state that the remaining ops were NOT executed.
    const applied = failed.index
    const remaining = ops.length - failed.index - 1
    const appliedText = applied > 0
      ? `The first ${applied} op${applied === 1 ? ' was' : 's were'} already applied (not rolled back).`
      : 'No ops were applied.'
    const remainingText = remaining > 0
      ? ` The remaining ${remaining} op${remaining === 1 ? ' was' : 's were'} NOT executed.`
      : ''
    ctx.notification.error({
      description: `Op ${failed.index + 1} of ${ops.length} (${opLabel(radius.ops[failed.index])}) failed: ${failed.message}. ${appliedText}${remainingText}`,
      message: applied > 0 ? 'Write set partially applied' : 'Write set not applied',
      placement: 'bottomLeft',
    })
  }

  // Converge the UI after any applied write — same immediate + staggered background
  // re-invalidation runRest uses (snowplow's informer read can lag the write).
  if (results.some((result) => result.ok)) {
    await ctx.invalidateQueries()
    for (const ms of POST_WRITE_REVALIDATE_DELAYS_MS) {
      const timer = setTimeout(() => { void ctx.invalidateQueries() }, ms)
      ctx.registerCleanup(() => clearTimeout(timer))
    }
  }

  return results
}
