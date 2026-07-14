/**
 * W4 previewPage v2 (FE-P4) — the SANDBOX LIVE PREVIEW orchestrator (Addendum A.2).
 * Config-gated by api.PREVIEW_SANDBOX_NAMESPACE: the bridge routes `previewPage` here
 * ONLY when the sandbox is configured — absent config, the verb stays the v1
 * zero-network source preview (previewHandlers.ts) EXACTLY. The verb SHAPE is
 * unchanged ({"verb":"previewPage","widgets":[…]} — no prompt churn).
 *
 * The flow (each step falls back to a graceful chip + the source drawer, never a crash):
 *   1. VALIDATE (A.2.1): every draft against its co-located widget schema (ajv) —
 *      any failure → the v1 source drawer WITH the verdicts; garbage is never applied.
 *   2. REWRITE (A.2.2): namespace FORCED to the sandbox, preview labels stamped,
 *      in-set refs re-pointed (previewSandbox.rewriteDraftsForSandbox).
 *   3. SWEEP + APPLY (A.2.3): best-effort DELETE of the previous preview's drafts
 *      (latest wins, re-used names never 409), then ordered POST chunks (≤10 ops)
 *      through the SAME runRestSet fabric — per-user identity, ONE AuditRecord per
 *      chunk, stop-on-error. The aggregated confirm is SKIPPED because every op is
 *      confined to the quarantined sandbox (verified per-op by the fabric itself —
 *      see SetDispatchOptions.skipConfirmForSandbox); provenance is STILL emitted.
 *   4. RENDER (A.2.4): the drawer opens on the ROOT draft's REAL `widgetEndpoint` —
 *      the deployed snowplow compiles spec→status and resolves children exactly like
 *      a production page ("Rendered (live)" + the source view, previewSurface.tsx).
 *   5. TEARDOWN (A.2.5): drawer close → best-effort silent DELETE set of THIS
 *      preview's drafts (epoch-guarded: a stale close never deletes a newer preview);
 *      the sandbox TTL janitor (CHART-SBX) is the backstop.
 */

import type { SetDispatchOptions, WriteOp, WriteOpResult } from '../../hooks/runRestSet'

import type { PortalActionProposal } from './actionBridge'
import { type ApplyResourceSetOp, buildSetOpPath, isApplySetAllowed } from './applyResourceSet'
import { buildPagePreviewPayload, parsePagePreviewArgs } from './previewBridge'
import { openAutopilotPreview } from './previewBus'
import {
  buildSandboxApplyOps,
  buildSandboxTeardownOps,
  buildSandboxWidgetEndpoint,
  chunkSetOps,
  type DraftTarget,
  draftTargetsOf,
  type PreviewPageSession,
  rewriteDraftsForSandbox,
  rootDraftTargetOf,
  validatePageDrafts,
} from './previewSandbox'
import type { AutopilotActionChip } from './types'

/** What the v2 flow needs from the bridge: the sandbox, the thread id, the session,
 * and the hook's REAL set dispatcher (origin already bound by the bridge). */
export interface PreviewPageV2Deps {
  sandboxNamespace: string
  /** The provider's thread/session id — stamped as the per-session draft label. */
  sessionId: string
  /** The provider-scoped teardown session (epoch-guarded drawer-close deletes). */
  session: PreviewPageSession
  handleActionSet: (ops: readonly WriteOp[], options?: SetDispatchOptions) => Promise<WriteOpResult[] | null>
}

/** The drawer caption of a LIVE sandbox preview (A.2.4). */
export const LIVE_PREVIEW_CAPTION
  = 'Live preview — the drafts are applied to the quarantined preview sandbox and rendered by the real server, with your identity and permissions. Closing this drawer removes them.'

const compileWriteOps = (ops: readonly ApplyResourceSetOp[]): WriteOp[] =>
  ops.map((op) => ({
    path: buildSetOpPath(op),
    verb: op.verb,
    ...(op.payload === undefined ? {} : { payload: op.payload }),
  }))

/** Fire a best-effort SILENT sandbox set (teardown/sweep): failures are swallowed —
 * the TTL janitor is the backstop — and the confirm is skipped (sandbox-confined). */
const dispatchBestEffort = async (ops: readonly ApplyResourceSetOp[], deps: PreviewPageV2Deps): Promise<void> => {
  if (!ops.length) {
    return
  }
  try {
    await deps.handleActionSet(compileWriteOps(ops), { silent: true, skipConfirmForSandbox: deps.sandboxNamespace })
  } catch {
    // Best-effort by contract (A.2.5) — a failed delete is the janitor's problem.
  }
}

/** The graceful-failure chip + source drawer (never a crash, nothing left behind claims). */
const blockedChip = (label: string): AutopilotActionChip => ({ label, readOnly: true, verb: 'previewPage' })

/**
 * The previewPage v2 handler. Returns the chip to render, or null ONLY for a
 * malformed proposal (denied exactly like v1's argSchema). Every later failure is
 * a graceful chip + drawer content — the model can read it and fix the drafts.
 */
export const applyPreviewPageV2 = async (
  proposal: PortalActionProposal,
  deps: PreviewPageV2Deps,
): Promise<AutopilotActionChip | null> => {
  const widgets = parsePagePreviewArgs(proposal)
  if (!widgets) {
    return null
  }

  // 1. VALIDATE — any failure: source drawer with the verdicts, NOTHING applied.
  const problems = await validatePageDrafts(widgets)
  if (problems.length) {
    openAutopilotPreview({
      ...buildPagePreviewPayload(widgets),
      caption: 'Validation failed — nothing was applied to the sandbox. Fix the drafts and preview again.',
      problems,
    })

    return blockedChip(`preview blocked — ${problems.length} validation error${problems.length === 1 ? '' : 's'}`)
  }

  // 2. REWRITE — sandbox namespace forced, labels stamped, in-set refs re-pointed.
  const rewritten = rewriteDraftsForSandbox(widgets, deps.sandboxNamespace, deps.sessionId)
  const targets = draftTargetsOf(rewritten)
  const root = rootDraftTargetOf(targets)
  if (!root) {
    openAutopilotPreview({
      ...buildPagePreviewPayload(rewritten),
      caption: 'The draft set has no widget to render as the page root (only RESTActions) — nothing was applied.',
    })

    return blockedChip('preview blocked — no widget draft to render as the page root')
  }

  // 3. SWEEP + APPLY. Defensive kernel pass FIRST (all-or-nothing, before any write):
  // every chunk must clear the applyResourceSet safety kernel under the sandbox
  // carve-out — by construction it does; a mismatch means a bug, so deny outright.
  const chunks = chunkSetOps(buildSandboxApplyOps(rewritten, deps.sandboxNamespace))
  if (!chunks.every((chunk) => isApplySetAllowed(chunk, deps.sandboxNamespace))) {
    return blockedChip('preview denied — drafts fall outside the sandbox write scope')
  }
  await dispatchBestEffort(deps.session.take(), deps)

  const applied: DraftTarget[] = []
  let failure: string | null = null
  let offset = 0
  for (const chunk of chunks) {
    // eslint-disable-next-line no-await-in-loop -- ordered chunks: chunk N+1 must not fire until N succeeded (same contract as the fabric)
    const results = await deps.handleActionSet(compileWriteOps(chunk), { silent: true, skipConfirmForSandbox: deps.sandboxNamespace })
    if (results === null) {
      failure = 'the write set was not dispatched'
      break
    }
    for (const result of results) {
      const target = targets[offset + result.index]
      if (result.ok) {
        applied.push(target)
      } else {
        failure = `${target.kind}/${target.name}: ${result.message}`
      }
    }
    if (failure) {
      break
    }
    offset += chunk.length
  }

  if (failure) {
    // Roll back what landed (best-effort), then show the failure AS drawer content.
    await dispatchBestEffort(buildSandboxTeardownOps(applied, deps.sandboxNamespace), deps)

    openAutopilotPreview({
      ...buildPagePreviewPayload(rewritten),
      caption: 'Applying the drafts to the preview sandbox failed — the drafts that had landed were removed (best-effort).',
      error: failure,
    })

    return { label: `preview apply failed — ${failure}`, readOnly: false, verb: 'previewPage' }
  }

  // 4-5. RENDER + arm the epoch-guarded drawer-close teardown.
  const epoch = deps.session.record(buildSandboxTeardownOps(applied, deps.sandboxNamespace))
  openAutopilotPreview({
    ...buildPagePreviewPayload(rewritten),
    caption: LIVE_PREVIEW_CAPTION,
    liveEndpoint: buildSandboxWidgetEndpoint(root, deps.sandboxNamespace),
    onClose: () => {
      void dispatchBestEffort(deps.session.takeIf(epoch), deps)
    },
    title: `Page preview (live) — ${applied.length} draft${applied.length === 1 ? '' : 's'} in ${deps.sandboxNamespace}`,
  })

  const label = proposal.label ?? `live preview — ${applied.length} draft${applied.length === 1 ? '' : 's'} → ${deps.sandboxNamespace}`

  return { label, readOnly: false, verb: 'previewPage' }
}
