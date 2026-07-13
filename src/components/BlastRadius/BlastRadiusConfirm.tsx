/**
 * BlastRadiusConfirm — the structured decision surface rendered INSIDE the HITL confirm
 * modal (as modal.confirm's `content`) for every mutating write (W0-2). It replaces the
 * bare "Are you sure?" prompt with: the VERB, the target GVR, the target CLUSTER + NAMESPACE,
 * the object COUNT (1 scalar / N for a W0-4 write-set), and the DIFF (create body / before↔after
 * update / delete identity). The BlastRadius is built upstream by buildBlastRadius (pure), so
 * this component is presentation-only — it takes the already-computed radius and shows it.
 *
 * The modal's Confirm/Cancel buttons are owned by modal.confirm (in useHandleActions); this is
 * only the body. It is deliberately plain markup so it can be rendered in a jsdom RTL test
 * without the antd App context the confirm modal itself needs.
 *
 * NOTE (antd Typography className collapse, see MEMORY): Typography keeps only the FIRST
 * className token, so every styled line here is a plain element with a single class — never a
 * multi-class Typography.
 */

import type { BlastRadius, BlastRadiusDiff, BlastRadiusSet, Gvr } from '../../hooks/blastRadius.types'

import styles from './BlastRadiusConfirm.module.css'

/** Human phrasing per verb — the plain-language intent shown next to the raw verb tag. */
const VERB_INTENT: Record<BlastRadius['verb'], string> = {
  DELETE: 'delete',
  PATCH: 'update',
  POST: 'create',
  PUT: 'replace',
}

/** Render a GVR as the familiar `resource.group/version` (core group → `resource/version`). */
const formatGvr = (gvr: Gvr): string => {
  const head = gvr.group ? `${gvr.resource}.${gvr.group}` : gvr.resource || '—'
  return gvr.version ? `${head}/${gvr.version}` : head
}

/** Stable pretty-print for the diff bodies (mono block). Non-throwing on cyclic/odd values. */
const stringify = (value: unknown): string => {
  if (value === undefined) {
    return ''
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    // A value JSON.stringify can't serialise (cyclic ref, BigInt, …) has no meaningful text form.
    return '[unserialisable value]'
  }
}

/** One labelled mono code block (a diff side); omitted by the caller when its value is absent. */
const DiffBlock = ({ label, tone, value }: { label: string; tone: 'before' | 'after'; value: unknown }) => (
  <div className={styles.diffSide}>
    <div className={tone === 'before' ? styles.diffLabelBefore : styles.diffLabelAfter}>{label}</div>
    <pre className={styles.code}>{stringify(value)}</pre>
  </div>
)

/** The verb-specific diff surface: create body, before↔after update, or delete identity. */
const DiffView = ({ diff }: { diff: BlastRadiusDiff }) => {
  if (diff.kind === 'create') {
    return <DiffBlock label='Will create' tone='after' value={diff.after} />
  }
  if (diff.kind === 'delete') {
    return <DiffBlock label='Will delete' tone='before' value={diff.before} />
  }
  // update: show both sides when a current object is known, else just the change body.
  return (
    <div className={styles.diffPair}>
      {diff.before !== undefined && <DiffBlock label='Current' tone='before' value={diff.before} />}
      <DiffBlock label='After' tone='after' value={diff.after} />
    </div>
  )
}

/** Compact single-line body preview for a set-op row (full diff bodies stay scalar-confirm territory). */
const previewOf = (value: unknown): string => {
  let text: string
  try {
    text = JSON.stringify(value) ?? String(value)
  } catch {
    text = '[unserialisable value]'
  }

  return text.length > 140 ? `${text.slice(0, 140)}…` : text
}

/** True when the radius is the aggregated W0-4 set shape (vs a scalar write). */
const isSetRadius = (radius: BlastRadius | BlastRadiusSet): radius is BlastRadiusSet => 'ops' in radius

/**
 * The W0-4 SET decision surface: the total object count + the ORDERED op list, each op a
 * calm one-liner (verb chip + target + namespace + irreversible badge + body preview).
 * Ops run in the order shown and stop at the first failure — the human confirms ONCE
 * for the whole set.
 */
const SetView = ({ radius }: { radius: BlastRadiusSet }) => {
  const irreversibleCount = radius.ops.filter((op) => op.irreversible).length

  return (
    <div className={styles.root} data-testid='blast-radius-confirm'>
      <div className={styles.headline}>
        <span className={styles.verb} data-verb='SET'>SET</span>
        <span className={styles.intent}>apply {radius.count} objects, in order</span>
      </div>

      <dl className={styles.facts}>
        <div className={styles.factRow}>
          <dt className={styles.factKey}>Objects</dt>
          <dd className={styles.factVal} data-testid='blast-radius-count'>{radius.count}</dd>
        </div>
        <div className={styles.factRow}>
          <dt className={styles.factKey}>Order</dt>
          <dd className={styles.factVal}>sequential — stops at the first failure</dd>
        </div>
        {irreversibleCount > 0 && (
          <div className={styles.factRow}>
            <dt className={styles.factKey}>Irreversible</dt>
            <dd className={styles.factVal}>{irreversibleCount} delete{irreversibleCount === 1 ? '' : 's'}</dd>
          </div>
        )}
      </dl>

      <ol className={styles.opList}>
        {radius.ops.map((op, index) => (
          // The index IS the op identity (dispatch order) — a set radius is immutable once built.
          <li className={styles.opRow} data-testid='blast-radius-set-op' key={index}>
            <div className={styles.opHead}>
              <span className={styles.opIndex}>{index + 1}</span>
              <span className={styles.verb} data-verb={op.verb}>{op.verb}</span>
              <span className={styles.target}>{formatGvr(op.gvr)}{op.name ? ` · ${op.name}` : ''}</span>
              <span className={styles.opNs}>{op.namespace || '—'}</span>
              {op.irreversible && <span className={styles.irreversible}>irreversible</span>}
            </div>
            {op.payloadPreview !== undefined && (
              <div className={styles.opPreview}>{previewOf(op.payloadPreview)}</div>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

export interface BlastRadiusConfirmProps {
  radius: BlastRadius | BlastRadiusSet
}

/**
 * The confirm-modal body. Pure presentation of an already-built BlastRadius: the human reads
 * exactly WHAT (verb+intent), WHERE (gvr+cluster+namespace+name), HOW MANY (count), and the
 * CHANGE (diff) before clicking Confirm. A W0-4 set radius renders the ordered op list
 * (SetView) instead of the scalar diff.
 */
const BlastRadiusConfirm = ({ radius }: BlastRadiusConfirmProps) => {
  if (isSetRadius(radius)) {
    return <SetView radius={radius} />
  }

  const { cluster, count, diff, gvr, name, namespace, verb } = radius

  return (
    <div className={styles.root} data-testid='blast-radius-confirm'>
      <div className={styles.headline}>
        <span className={styles.verb} data-verb={verb}>{verb}</span>
        <span className={styles.intent}>{VERB_INTENT[verb]}</span>
        {name && <span className={styles.target}>{name}</span>}
      </div>

      <dl className={styles.facts}>
        <div className={styles.factRow}>
          <dt className={styles.factKey}>Resource</dt>
          <dd className={styles.factVal}>{formatGvr(gvr)}</dd>
        </div>
        <div className={styles.factRow}>
          <dt className={styles.factKey}>Cluster</dt>
          <dd className={styles.factVal}>{cluster}</dd>
        </div>
        <div className={styles.factRow}>
          <dt className={styles.factKey}>Namespace</dt>
          <dd className={styles.factVal}>{namespace || '—'}</dd>
        </div>
        <div className={styles.factRow}>
          <dt className={styles.factKey}>Objects</dt>
          <dd className={styles.factVal} data-testid='blast-radius-count'>{count}</dd>
        </div>
      </dl>

      <DiffView diff={diff} />
    </div>
  )
}

export default BlastRadiusConfirm
