/**
 * P1 applySet — the SCOPED, human-gated `applyResourceSet` mutating portal-verb for
 * builder/fleet flows: apply ONE ORDERED set of up to MAX_APPLY_SET_OPS Krateo objects
 * through the W0-4 fabric (`runRestSet`), which replaces the vetoed snowplow /callset
 * with N sequential calls to the EXISTING endpoint — zero snowplow changes.
 *
 * GOVERNING INVARIANT (unchanged, mirrors `patchField`): Autopilot never mutates
 * directly and never reimplements behaviour — it drives the REAL portal by compiling a
 * proposal into the canonical write path. Like `patchField`, this is deliberately NOT a
 * read-only registry verb (READONLY_VERB_REGISTRY is read-only by construction): it is
 * a DISTINCT mutating branch owned by the bridge. Two independent safety layers gate it:
 *   1. `isApplySetAllowed` (below) — a pure, defense-in-depth scoping kernel, BROADER
 *      than patchField's composition-only rule because builder/fleet flows write
 *      CompositionDefinitions / widget CRs / config, but still NEVER an arbitrary
 *      cluster resource: (a) at most MAX_APPLY_SET_OPS ops, (b) every op's group must
 *      END with `.krateo.io`, OR be the core group ('') for ConfigMaps ONLY. Anything
 *      else is REJECTED here — the branch returns null, exactly like an unknown verb.
 *   2. The W0-4 gate — the compiled ops are dispatched via `deps.handleActionSet` →
 *      `runRestSet`, whose aggregated set-level BlastRadiusConfirm (ordered op list,
 *      per-op irreversible flag) ALWAYS blocks on ONE human confirm for the WHOLE set.
 *      Decline = nothing dispatched. This module NEVER bypasses that gate; the scoping
 *      kernel is purely additive on top of it.
 */

import type { MutatingVerb } from '../../hooks/blastRadius.types'
import type { WriteOp, WriteOpResult } from '../../hooks/runRestSet'
import { isMutatingVerb } from '../BlastRadius/buildBlastRadius'

/** The GVR (group/version/resource) one op targets. Core group is the empty string. */
export interface ApplyResourceSetGvr {
  group: string
  version: string
  resource: string
}

/** One ordered op of an `applyResourceSet` proposal (index order = dispatch order). */
export interface ApplyResourceSetOp {
  verb: MutatingVerb
  gvr: ApplyResourceSetGvr
  namespace: string
  /** Object name — REQUIRED for PUT/PATCH/DELETE (a named target); optional for POST (collection create). */
  name?: string
  /** Request body for POST/PUT/PATCH; a DELETE carries none. */
  payload?: unknown
}

/** The mutating `applyResourceSet` proposal shape (a superset of PortalActionProposal fields). */
export interface ApplyResourceSetProposal {
  verb: 'applyResourceSet'
  /** The ORDERED write ops — executed sequentially, stop on first error. */
  ops: ApplyResourceSetOp[]
  label?: string
}

/** Hard op-count cap: a builder/fleet set is small by design; anything larger is denied outright. */
export const MAX_APPLY_SET_OPS = 10

/**
 * The Krateo-owned group suffix. Every Krateo API group ENDS with `.krateo.io`
 * (core.krateo.io, <name>.composition.krateo.io, widgets.templates.krateo.io, …) —
 * scoping to this suffix (plus core ConfigMaps) is what confines the set fabric to
 * Krateo objects, NEVER an arbitrary cluster resource (a Deployment, a Secret, RBAC, …).
 */
export const KRATEO_GROUP_SUFFIX = '.krateo.io'

/**
 * Group allowlist: a Krateo-owned group (ends with `.krateo.io`) OR the core group ('')
 * for ConfigMaps ONLY (portal/blueprint config rides in ConfigMaps; no other core kind
 * — never a Secret, Pod, ServiceAccount, … — is writable through this verb).
 */
export const isSetOpGroupAllowed = (gvr: ApplyResourceSetGvr | undefined): boolean => {
  if (typeof gvr?.group !== 'string' || typeof gvr.resource !== 'string') {
    return false
  }
  if (gvr.group.endsWith(KRATEO_GROUP_SUFFIX)) {
    return true
  }

  return gvr.group === '' && gvr.resource === 'configmaps'
}

/**
 * One op's shape + scope check: a mutating verb, a complete GVR + namespace, a name
 * unless it is a collection POST, and the group allowlist. Pure predicate.
 */
export const isSetOpAllowed = (op: ApplyResourceSetOp | undefined): boolean => {
  if (!op || !isMutatingVerb(op.verb)) {
    return false
  }
  const { gvr, name, namespace } = op
  if (!gvr || typeof gvr.version !== 'string' || !gvr.version || typeof gvr.resource !== 'string' || !gvr.resource) {
    return false
  }
  if (typeof namespace !== 'string' || !namespace) {
    return false
  }
  // Only a POST may omit the name (create into the collection); PUT/PATCH/DELETE target a named object.
  if (op.verb !== 'POST' && (typeof name !== 'string' || !name)) {
    return false
  }

  return isSetOpGroupAllowed(gvr)
}

/** Runtime array guard that keeps the element type (Array.isArray alone widens to any[]). */
const isOpArray = (value: unknown): value is readonly ApplyResourceSetOp[] => Array.isArray(value)

/**
 * The SET SAFETY KERNEL. Pure predicate: is this ordered op list allowed to dispatch?
 *   ALLOW  — a non-empty list of at most MAX_APPLY_SET_OPS ops, EVERY op passing
 *            isSetOpAllowed (mutating verb, complete target, allowlisted group).
 *   REJECT — empty, oversized, or ANY op out of scope (all-or-nothing: one bad op
 *            denies the whole set — never a silent partial dispatch).
 * Defense-in-depth ON TOP of the human W0-4 set confirm — never a substitute for it.
 */
export const isApplySetAllowed = (ops: readonly ApplyResourceSetOp[] | undefined): boolean =>
  isOpArray(ops) && ops.length > 0 && ops.length <= MAX_APPLY_SET_OPS && ops.every((op) => isSetOpAllowed(op))

/**
 * Build the op's apiserver path in the exact shape `parseTargetFromPath` (the W0-4
 * confirm) understands: core group under /api/<version>/…, named groups under
 * /apis/<group>/<version>/… — so the set confirm shows the real objects each call hits.
 * Mirrors patchField's buildPatchRefPath; a POST targets the collection (no name).
 */
export const buildSetOpPath = (op: ApplyResourceSetOp): string => {
  const { gvr, name, namespace, verb } = op
  const root = gvr.group ? `/apis/${gvr.group}/${gvr.version}` : `/api/${gvr.version}`
  const collection = `${root}/namespaces/${namespace}/${gvr.resource}`

  return verb === 'POST' || !name ? collection : `${collection}/${name}`
}

/** The runtime handler injected by the bridge — the hook's REAL set dispatcher (→ runRestSet). */
export interface ApplyResourceSetDeps {
  handleActionSet: (ops: readonly WriteOp[]) => Promise<WriteOpResult[] | null>
}

/** The chip a dispatched applyResourceSet returns (readOnly:false — it is a mutation). */
export interface ApplyResourceSetChip {
  verb: 'applyResourceSet'
  label: string
  readOnly: false
}

/**
 * Compile + dispatch an `applyResourceSet` proposal. Returns null when the set fails the
 * scoping kernel (denied, exactly like an unknown verb — nothing dispatched) OR when the
 * human declines the ONE aggregated W0-4 confirm (handleActionSet returns null — nothing
 * dispatched). Dispatch is via `deps.handleActionSet` → `runRestSet`, so the whole set
 * ALWAYS flows through the blast-radius gate and NEVER bypasses ctx.confirm.
 */
export const applyResourceSet = async (
  proposal: ApplyResourceSetProposal,
  deps: ApplyResourceSetDeps,
): Promise<ApplyResourceSetChip | null> => {
  const { ops } = proposal
  // SET SAFETY KERNEL (layer 1): op-count cap + per-op scope, else deny the WHOLE set.
  if (!isApplySetAllowed(ops)) {
    return null
  }

  // Compile to the fabric's ordered WriteOps (path shaped for the W0-4 confirm's parser).
  const writeOps: WriteOp[] = ops.map((op) => ({
    path: buildSetOpPath(op),
    verb: op.verb,
    ...(op.payload === undefined ? {} : { payload: op.payload }),
  }))

  // THE GATE (layer 2): runRestSet confirms the WHOLE set once; decline → null → no chip.
  const results = await deps.handleActionSet(writeOps)
  if (results === null) {
    return null
  }

  const label = proposal.label ?? `apply ${ops.length} object${ops.length === 1 ? '' : 's'}`

  return { label, readOnly: false, verb: 'applyResourceSet' }
}
