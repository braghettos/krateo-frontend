/**
 * BlastRadius — the structured decision surface every mutating write shows the human
 * BEFORE it fires (W0-2 HITL gate). It is the one shape flowing from the write chokepoint
 * (useHandleActions → runRest) into BlastRadiusConfirm, and later into the W0-3 audit
 * record. It is deliberately serialisable (plain data, no React) so it can be built by a
 * pure function, unit-tested without a DOM, and logged verbatim.
 *
 * A single write is `count: 1`; a W0-4 N-fan-out write-set is `count: writeSet.length`.
 * `cluster` is 'local' for a same-cluster write and the target cluster name for a
 * hub→spoke apply. The `diff` describes what changes in apiserver terms:
 *   - create (POST):  the object body to be created lives in `after` (no `before`).
 *   - update (PATCH/PUT): `before` = current object (if known), `after` = merge/replace body.
 *   - delete (DELETE): the identity being removed lives in `before` (no `after`).
 */

/** The four apiserver mutating verbs the gate governs. GET is read-only and never gated here. */
export type MutatingVerb = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** A parsed group/version/resource triple (the apiserver target of the write). */
export interface Gvr {
  group: string
  version: string
  resource: string
}

/** The apiserver-shaped change the human is asked to authorise. */
export interface BlastRadiusDiff {
  kind: 'create' | 'update' | 'delete'
  /** Current object (update) or the identity being removed (delete); omitted for create. */
  before?: unknown
  /** Object to create (create) or the merge/replace body (update); omitted for delete. */
  after?: unknown
}

/** The full pre-write summary rendered by BlastRadiusConfirm and consumed by the W0-3 audit. */
export interface BlastRadius {
  verb: MutatingVerb
  gvr: Gvr
  /** Target cluster — 'local' for a same-cluster write, else the spoke/target name. */
  cluster: string
  namespace: string
  /** Object name when the ref targets a named object (detail/delete); absent for a list POST. */
  name?: string
  /** 1 for a scalar write; writeSet.length for a W0-4 N-fan-out apply. */
  count: number
  diff: BlastRadiusDiff
}
