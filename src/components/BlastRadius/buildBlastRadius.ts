/**
 * buildBlastRadius — the pure kernel of the W0-2 HITL gate. Given a mutating action's
 * resolved apiserver target (verb + ref path), the built request payload, and (optionally)
 * a resolved "before" object + a W0-4 write-set, it produces the serialisable BlastRadius
 * the human is asked to authorise. No React, no fetch, no globals → unit-testable in
 * isolation, and the same shape can later be logged verbatim by the W0-3 audit record.
 *
 * Verb → diff mapping (apiserver semantics):
 *   POST            → create diff:  after = payload            (no before)
 *   PATCH / PUT     → update diff:  before = current (if any), after = payload
 *   DELETE          → delete diff:  before = identity/current  (no after)
 *
 * Target (GVR + namespace + name) is parsed from the ResourceRef `path` (the /apis/… or
 * /api/… URL snowplow targets) — the SAME parse the Autopilot page-context uses — so the
 * gate shows exactly the object the request will hit. `cluster` is 'local' for a same-cluster
 * write and the spoke name when the payload declares a hub→spoke target (W0-4 / W3-1).
 * `count` is 1 for a scalar write, or writeSet.length for an N-fan-out apply.
 */

import type { BlastRadius, BlastRadiusDiff, Gvr, MutatingVerb } from '../../hooks/blastRadius.types'

/** The apiserver verbs the gate governs. GET (read) never produces a BlastRadius. */
const MUTATING_VERBS: readonly MutatingVerb[] = ['POST', 'PUT', 'PATCH', 'DELETE']

/** True for the four mutating verbs — the gate is mandatory for exactly these. */
export const isMutatingVerb = (verb: string): verb is MutatingVerb =>
  (MUTATING_VERBS as readonly string[]).includes(verb)

/** A parsed apiserver target: the GVR plus optional namespace/name from the ref path. */
interface ParsedTarget {
  gvr: Gvr
  namespace?: string
  name?: string
}

/**
 * Parse a ResourceRef `path` (…?query and trailing slash tolerated) into {gvr, namespace?, name?}.
 * Core group is served under /api/<version>/…; named groups under /apis/<group>/<version>/….
 * Returns undefined when the path is not a recognisable apiserver URL, so the caller can fall
 * back to an empty GVR rather than fabricate one.
 */
export const parseTargetFromPath = (path: string | undefined): ParsedTarget | undefined => {
  if (typeof path !== 'string' || !path) {
    return undefined
  }
  const clean = path.split('?')[0].replace(/\/+$/, '')
  const segments = clean.split('/').filter(Boolean)
  const prefix = segments.shift()
  let group: string
  let version: string | undefined
  if (prefix === 'api') {
    group = ''
    version = segments.shift()
  } else if (prefix === 'apis') {
    group = segments.shift() ?? ''
    version = segments.shift()
  } else {
    return undefined
  }
  if (!version) {
    return undefined
  }
  let namespace: string | undefined
  if (segments[0] === 'namespaces') {
    segments.shift()
    namespace = segments.shift()
  }
  const resource = segments.shift()
  if (!resource) {
    return undefined
  }
  const name = segments.shift()
  return { gvr: { group, resource, version }, name, namespace }
}

/** Read a nested string at a dotted path from an unknown object, or undefined. */
const readString = (obj: unknown, dotted: string): string | undefined => {
  let cur: unknown = obj
  for (const key of dotted.split('.')) {
    if (typeof cur !== 'object' || cur === null) {
      return undefined
    }
    cur = (cur as Record<string, unknown>)[key]
  }
  return typeof cur === 'string' ? cur : undefined
}

/**
 * Resolve the target cluster. A hub→spoke write declares its spoke via the payload's
 * `spec.deploy.targetRef.name` (the KubernetesTarget/targetRef convention W0-4 / W3-1 uses);
 * absent that, the write hits the same cluster → 'local'. An explicit override wins.
 */
const resolveCluster = (payload: unknown, override: string | undefined): string => {
  if (override) {
    return override
  }
  return readString(payload, 'spec.deploy.targetRef.name') ?? 'local'
}

/** Build the verb-specific diff (create/update/delete) from payload + optional current object. */
const buildDiff = (verb: MutatingVerb, payload: unknown, before: unknown): BlastRadiusDiff => {
  if (verb === 'POST') {
    return { after: payload, kind: 'create' }
  }
  if (verb === 'DELETE') {
    // The identity being removed: a freshly-read current object when available, else the ref's payload.
    return { before: before ?? payload, kind: 'delete' }
  }
  // PATCH / PUT: current object (if we have one) vs the merge/replace body.
  return { after: payload, before, kind: 'update' }
}

/** Inputs to buildBlastRadius — the action's resolved target plus the resolved write body. */
export interface BuildBlastRadiusInput {
  /** The apiserver verb of the ResourceRef the action fires (POST/PUT/PATCH/DELETE). */
  verb: MutatingVerb
  /** The ResourceRef `path` (the /apis/… or /api/… URL) — parsed for GVR/namespace/name. */
  path: string | undefined
  /** The built request body (from buildPayload). create/update `after`; delete falls back to it. */
  payload?: unknown
  /** A freshly-read current object, when available, so update/delete can show a real `before`. */
  before?: unknown
  /** A W0-4 N-fan-out write-set; when present, count = writeSet.length (else 1). */
  writeSet?: readonly unknown[]
  /** Explicit target cluster override (else derived from the payload's targetRef, else 'local'). */
  cluster?: string
}

/**
 * Compute the BlastRadius for a single mutating action (or a W0-4 write-set). The result is
 * the human's decision surface (verb + target GVR + cluster/namespace + object count + diff)
 * and, later, the W0-3 audit payload. Pure: same inputs → same output, no side effects.
 */
export const buildBlastRadius = (input: BuildBlastRadiusInput): BlastRadius => {
  const { before, cluster, path, payload, verb, writeSet } = input
  const parsed = parseTargetFromPath(path)
  const gvr: Gvr = parsed?.gvr ?? { group: '', resource: '', version: '' }
  // Prefer the object name the payload carries (create-form metadata.name) over the ref path's,
  // so a list-scoped POST (no name in the URL) still names the object being created.
  const name = readString(payload, 'metadata.name') ?? parsed?.name
  const namespace = readString(payload, 'metadata.namespace') ?? parsed?.namespace ?? ''
  const count = writeSet && writeSet.length > 0 ? writeSet.length : 1

  return {
    cluster: resolveCluster(payload, cluster),
    count,
    diff: buildDiff(verb, payload, before),
    gvr,
    namespace,
    verb,
    ...(name ? { name } : {}),
  }
}
