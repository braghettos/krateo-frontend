/**
 * FE-K3 — the PREVIEW GATE, pure-logic coverage:
 *   - an applyResourceSet writing restdefinitions is DENIED before any preview;
 *   - a recorded previewRestDef of the SAME kind+resourceGroup allows it;
 *   - a kind or group mismatch stays denied (matching is on BOTH coordinates);
 *   - identity-less payloads can never satisfy the gate (deny-by-default);
 *   - non-restdefinitions sets pass untouched;
 *   - reset() (the newThread hook) forgets every preview — denied again.
 */
import { describe, expect, it } from 'vitest'

import type { ApplyResourceSetOp } from './applyResourceSet'
import { createPreviewGate, restDefIdentityOf } from './previewGate'

const draft = (kind: string, group: string): Record<string, unknown> => ({
  apiVersion: 'ogen.krateo.io/v1alpha1',
  kind: 'RestDefinition',
  metadata: { name: kind.toLowerCase(), namespace: 'krateo-system' },
  spec: {
    oasPath: 'https://example.org/oas.yaml',
    resource: { kind, verbsDescription: [{ action: 'get', method: 'GET', path: '/x' }] },
    resourceGroup: group,
  },
})

const restDefOp = (payload: unknown): ApplyResourceSetOp => ({
  gvr: { group: 'ogen.krateo.io', resource: 'restdefinitions', version: 'v1alpha1' },
  name: 'experiment',
  namespace: 'krateo-system',
  payload,
  verb: 'POST',
})

const configMapOp: ApplyResourceSetOp = {
  gvr: { group: '', resource: 'configmaps', version: 'v1' },
  name: 'experiment-oas',
  namespace: 'krateo-system',
  payload: { apiVersion: 'v1', kind: 'ConfigMap' },
  verb: 'POST',
}

describe('restDefIdentityOf — the kind+resourceGroup coordinates', () => {
  it('extracts both coordinates, and returns null when either is missing', () => {
    expect(restDefIdentityOf(draft('Experiment', 'mlflow.example.org')))
      .toEqual({ group: 'mlflow.example.org', kind: 'Experiment' })
    expect(restDefIdentityOf({ spec: { resource: { kind: 'Experiment' } } })).toBeNull()
    expect(restDefIdentityOf({ spec: { resourceGroup: 'mlflow.example.org' } })).toBeNull()
    expect(restDefIdentityOf(undefined)).toBeNull()
    expect(restDefIdentityOf('not-an-object')).toBeNull()
  })
})

describe('the preview gate — PREVIEW-BEFORE-PUBLISH, enforced on the host', () => {
  it('DENIES an unpreviewed restdefinitions publish with the preview-first message', () => {
    const gate = createPreviewGate()
    const verdict = gate.evaluate([configMapOp, restDefOp(draft('Experiment', 'mlflow.example.org'))])
    expect(verdict.allowed).toBe(false)
    if (verdict.allowed) {
      return
    }
    expect(verdict.reason).toContain('preview first')
    expect(verdict.reason).toContain('Experiment (mlflow.example.org)')
  })

  it('ALLOWS a publish whose kind+resourceGroup was previewed earlier in the thread', () => {
    const gate = createPreviewGate()
    gate.recordPreview(draft('Experiment', 'mlflow.example.org'))
    expect(gate.evaluate([configMapOp, restDefOp(draft('Experiment', 'mlflow.example.org'))])).toEqual({ allowed: true })
    // the 1-op URL-first publish passes too
    expect(gate.evaluate([restDefOp(draft('Experiment', 'mlflow.example.org'))])).toEqual({ allowed: true })
  })

  it('a kind OR group mismatch stays denied — matching is on BOTH coordinates', () => {
    const gate = createPreviewGate()
    gate.recordPreview(draft('Experiment', 'mlflow.example.org'))
    expect(gate.evaluate([restDefOp(draft('Run', 'mlflow.example.org'))]).allowed).toBe(false)
    expect(gate.evaluate([restDefOp(draft('Experiment', 'other.example.org'))]).allowed).toBe(false)
  })

  it('an identity-less restdefinitions payload can NEVER satisfy the gate (deny-by-default)', () => {
    const gate = createPreviewGate()
    gate.recordPreview(draft('Experiment', 'mlflow.example.org'))
    const verdict = gate.evaluate([restDefOp({ spec: {} })])
    expect(verdict.allowed).toBe(false)
    if (verdict.allowed) {
      return
    }
    expect(verdict.reason).toContain('no resource.kind/resourceGroup')
  })

  it('sets without a restdefinitions op pass untouched (the gate guards ONLY the KOG publish)', () => {
    const gate = createPreviewGate()
    expect(gate.evaluate([configMapOp])).toEqual({ allowed: true })
    expect(gate.evaluate([])).toEqual({ allowed: true })
    expect(gate.evaluate(undefined)).toEqual({ allowed: true })
  })

  it('previews ACCUMULATE within a thread — iterating on two drafts allows either publish', () => {
    const gate = createPreviewGate()
    gate.recordPreview(draft('Experiment', 'mlflow.example.org'))
    gate.recordPreview(draft('Run', 'mlflow.example.org'))
    expect(gate.evaluate([restDefOp(draft('Experiment', 'mlflow.example.org'))]).allowed).toBe(true)
    expect(gate.evaluate([restDefOp(draft('Run', 'mlflow.example.org'))]).allowed).toBe(true)
  })

  it('reset() (newThread) forgets every recorded preview — the publish is denied again', () => {
    const gate = createPreviewGate()
    gate.recordPreview(draft('Experiment', 'mlflow.example.org'))
    expect(gate.evaluate([restDefOp(draft('Experiment', 'mlflow.example.org'))]).allowed).toBe(true)
    gate.reset()
    expect(gate.evaluate([restDefOp(draft('Experiment', 'mlflow.example.org'))]).allowed).toBe(false)
  })

  it('recording an identity-less draft arms nothing', () => {
    const gate = createPreviewGate()
    gate.recordPreview({ spec: { resource: {} } })
    expect(gate.evaluate([restDefOp(draft('Experiment', 'mlflow.example.org'))]).allowed).toBe(false)
  })
})
