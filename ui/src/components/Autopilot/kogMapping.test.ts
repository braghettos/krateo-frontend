/**
 * FE-K1 — pure-logic coverage of the KOG RestDefinition mapper/validator:
 *   - parseOasPath admits EXACTLY the two live-CRD forms (configmap:// + http(s)://);
 *   - validateRestDefinitionDraft mirrors the live CRD (required fields, enums,
 *     findby-only fields, requestFieldMapping exactly-one-of, DNS names);
 *   - restDefImmutabilityWarnings surfaces every CEL-immutable field the draft sets;
 *   - buildKogPublishOps compiles the 1-op (URL-first) / 2-op (ConfigMap + RestDefinition,
 *     $oasAttachment token) publish plans — and the built ops pass the set kernel.
 * Fixtures mirror the oasgen samples (mlflow URL path; a github-style configmap path).
 */
import { describe, expect, it } from 'vitest'

import { isApplySetAllowed } from './applyResourceSet'
import {
  buildKogPublishOps,
  KOG_MANAGED_BY_LABEL,
  parseOasPath,
  REST_DEFINITION_GVR,
  restDefImmutabilityWarnings,
  validateRestDefinitionDraft,
} from './kogMapping'

/** The oasgen mlflow sample (URL-first path), verbatim shape. */
const mlflowDraft = {
  apiVersion: 'ogen.krateo.io/v1alpha1',
  kind: 'RestDefinition',
  metadata: { name: 'mlflow-experiments', namespace: 'krateo-system' },
  spec: {
    oasPath: 'https://raw.githubusercontent.com/krateoplatformops/mlflow-oas3/main/mlflow.yaml',
    resource: {
      identifiers: ['experiment_id'],
      kind: 'Experiment',
      verbsDescription: [
        { action: 'create', method: 'POST', path: '/api/2.0/mlflow/experiments/create' },
        { action: 'delete', method: 'POST', path: '/api/2.0/mlflow/experiments/delete' },
        { action: 'get', method: 'GET', path: '/api/2.0/mlflow/experiments/get' },
        { action: 'update', method: 'POST', path: '/api/2.0/mlflow/experiments/update' },
      ],
    },
    resourceGroup: 'local.mlflow.com',
  },
}

/** A github-style paste-path draft (configmap:// oasPath + requestFieldMapping + findby). */
const repoDraft = {
  apiVersion: 'ogen.krateo.io/v1alpha1',
  kind: 'RestDefinition',
  metadata: { name: 'repo', namespace: 'krateo-system' },
  spec: {
    oasPath: 'configmap://krateo-system/repo-oas/openapi.yaml',
    resource: {
      identifiers: ['id'],
      kind: 'Repo',
      verbsDescription: [
        { action: 'create', method: 'POST', path: '/orgs/{org}/repos' },
        {
          action: 'get',
          method: 'GET',
          path: '/repos/{owner}/{repo}',
          requestFieldMapping: [{ inCustomResource: 'spec.name', inPath: 'repo' }],
        },
        { action: 'findby', identifiersMatchPolicy: 'AND', method: 'GET', path: '/orgs/{org}/repos' },
      ],
    },
    resourceGroup: 'github.kog.example.org',
  },
}

/** Deep-clone + apply a mutation — fixtures stay pristine. */
const withDraft = (mutate: (draft: typeof repoDraft) => void): Record<string, unknown> => {
  const clone = JSON.parse(JSON.stringify(repoDraft)) as typeof repoDraft
  mutate(clone)
  return clone as unknown as Record<string, unknown>
}

describe('parseOasPath — exactly the two live-CRD forms', () => {
  it('parses configmap://<ns>/<name>/<key> and http(s):// URLs', () => {
    expect(parseOasPath('configmap://krateo-system/repo-oas/openapi.yaml'))
      .toEqual({ form: 'configmap', key: 'openapi.yaml', name: 'repo-oas', namespace: 'krateo-system' })
    expect(parseOasPath('https://example.org/oas.yaml')).toEqual({ form: 'url', url: 'https://example.org/oas.yaml' })
    // http is first-class per the live CRD pattern (https?://) — not https-only
    expect(parseOasPath('http://example.org/oas.yaml')).toEqual({ form: 'url', url: 'http://example.org/oas.yaml' })
  })

  it('rejects every other form', () => {
    expect(parseOasPath('file:///tmp/oas.yaml')).toBeNull()
    expect(parseOasPath('ftp://example.org/oas.yaml')).toBeNull()
    expect(parseOasPath('configmap://only-two/segments')).toBeNull()
    expect(parseOasPath('configmap://a/b/c/d')).toBeNull()
    expect(parseOasPath('configmap://Bad_NS/name/key.yaml')).toBeNull()
    expect(parseOasPath('configmap://ns/name/bad key')).toBeNull()
    expect(parseOasPath('')).toBeNull()
    expect(parseOasPath(42)).toBeNull()
  })
})

describe('validateRestDefinitionDraft — mirrors the live CRD shape', () => {
  it('accepts the mlflow (URL) and repo (configmap + findby + mapping) fixtures', () => {
    expect(validateRestDefinitionDraft(mlflowDraft)).toEqual([])
    expect(validateRestDefinitionDraft(repoDraft as unknown as Record<string, unknown>)).toEqual([])
  })

  it('requires the envelope: apiVersion, kind, DNS-1123 metadata name + namespace', () => {
    expect(validateRestDefinitionDraft({})).toEqual(expect.arrayContaining([
      expect.stringContaining('apiVersion must be ogen.krateo.io/v1alpha1'),
      expect.stringContaining('kind must be RestDefinition'),
      expect.stringContaining('metadata.name is required'),
      expect.stringContaining('metadata.namespace is required'),
      expect.stringContaining('spec is required'),
    ]))
    expect(validateRestDefinitionDraft(withDraft((draft) => {
      draft.metadata.name = 'Not_A_DNS_Name'
    }))).toContainEqual(expect.stringContaining('metadata.name'))
  })

  it('requires oasPath / resourceGroup / resource.kind / a non-empty verbsDescription', () => {
    const errors = validateRestDefinitionDraft({
      apiVersion: 'ogen.krateo.io/v1alpha1',
      kind: 'RestDefinition',
      metadata: { name: 'x', namespace: 'krateo-system' },
      spec: { resource: { verbsDescription: [] } },
    })
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('spec.oasPath is required'),
      expect.stringContaining('spec.resourceGroup is required'),
      expect.stringContaining('spec.resource.kind is required'),
      expect.stringContaining('verbsDescription requires at least one'),
    ]))
  })

  it('rejects a non-form oasPath and a non-subdomain resourceGroup', () => {
    expect(validateRestDefinitionDraft(withDraft((draft) => {
      draft.spec.oasPath = 'file:///oas.yaml'
    }))).toContainEqual(expect.stringContaining('spec.oasPath must be configmap://'))
    expect(validateRestDefinitionDraft(withDraft((draft) => {
      draft.spec.resourceGroup = 'Not A Group'
    }))).toContainEqual(expect.stringContaining('resourceGroup must be a DNS subdomain'))
  })

  it('enforces the verb enums (uppercase methods) and the required path', () => {
    const errors = validateRestDefinitionDraft(withDraft((draft) => {
      draft.spec.resource.verbsDescription = [
        { action: 'list', method: 'GET', path: '/x' } as never,
        { action: 'get', method: 'get', path: '/x' } as never,
        { action: 'get', method: 'GET' } as never,
      ]
    }))
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('verbsDescription[0]: action must be one of create|update|get|delete|findby'),
      expect.stringContaining('verbsDescription[1]: method must be one of GET|POST|PUT|DELETE|PATCH'),
      expect.stringContaining('verbsDescription[2]: path is required'),
    ]))
  })

  it('confines identifiersMatchPolicy + pagination to findby actions (the CRD CEL rules)', () => {
    const errors = validateRestDefinitionDraft(withDraft((draft) => {
      draft.spec.resource.verbsDescription = [
        { action: 'create', identifiersMatchPolicy: 'AND', method: 'POST', pagination: { type: 'continuationToken' }, path: '/x' } as never,
        { action: 'findby', identifiersMatchPolicy: 'XOR', method: 'GET', path: '/x' } as never,
      ]
    }))
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('verbsDescription[0]: identifiersMatchPolicy can only be set on a findby action'),
      expect.stringContaining('verbsDescription[0]: pagination can only be set on a findby action'),
      expect.stringContaining('verbsDescription[1]: identifiersMatchPolicy must be AND or OR'),
    ]))
  })

  it('enforces requestFieldMapping: exactly one of inPath|inQuery|inBody + inCustomResource', () => {
    const errors = validateRestDefinitionDraft(withDraft((draft) => {
      draft.spec.resource.verbsDescription = [{
        action: 'get',
        method: 'GET',
        path: '/x',
        requestFieldMapping: [
          { inCustomResource: 'spec.a' },
          { inCustomResource: 'spec.b', inPath: 'b', inQuery: 'b' },
          { inQuery: 'c' },
        ],
      } as never]
    }))
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('requestFieldMapping[0]: exactly one of inPath|inQuery|inBody must be set (got 0)'),
      expect.stringContaining('requestFieldMapping[1]: exactly one of inPath|inQuery|inBody must be set (got 2)'),
      expect.stringContaining('requestFieldMapping[2]: inCustomResource is required'),
    ]))
  })

  it('validates configurationFields entries (fromOpenAPI{name,in} + fromRestDefinition.actions ≥ 1)', () => {
    const errors = validateRestDefinitionDraft(withDraft((draft) => {
      (draft.spec.resource as Record<string, unknown>).configurationFields = [
        { fromOpenAPI: { name: 'api_url' }, fromRestDefinition: { actions: [] } },
      ]
    }))
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringContaining('configurationFields[0]: fromOpenAPI{name, in} is required'),
      expect.stringContaining('configurationFields[0]: fromRestDefinition.actions requires at least one entry'),
    ]))
  })
})

describe('restDefImmutabilityWarnings — the CEL-immutable fields, surfaced BEFORE publish', () => {
  it('always warns on kind + resourceGroup, plus each optional immutable list the draft sets', () => {
    const warnings = restDefImmutabilityWarnings(withDraft((draft) => {
      (draft.spec.resource as Record<string, unknown>).excludedSpecFields = ['tags']
    }))
    expect(warnings).toEqual([
      'immutable once generated: resource.kind (Repo) — changing it later means delete + recreate',
      'immutable once generated: resourceGroup (github.kog.example.org)',
      'immutable once generated: identifiers (id)',
      'immutable once generated: excludedSpecFields (tags)',
    ])
  })

  it('still warns (without echoes) on an empty draft — the duty to warn never disappears', () => {
    expect(restDefImmutabilityWarnings({})).toEqual([
      'immutable once generated: resource.kind — changing it later means delete + recreate',
      'immutable once generated: resourceGroup',
    ])
  })
})

describe('buildKogPublishOps — the URL-first 1-op / paste 2-op publish plans', () => {
  it('URL oasPath → ONE op: POST restdefinitions (no ConfigMap at all)', () => {
    const plan = buildKogPublishOps(mlflowDraft)
    expect(plan.ok).toBe(true)
    if (!plan.ok) {
      return
    }
    expect(plan.ops).toEqual([{
      gvr: REST_DEFINITION_GVR,
      name: 'mlflow-experiments',
      namespace: 'krateo-system',
      payload: mlflowDraft,
      verb: 'POST',
    }])
    expect(isApplySetAllowed(plan.ops)).toBe(true)
  })

  it('configmap:// oasPath → TWO ordered ops: ConfigMap (with the $oasAttachment token) FIRST', () => {
    const plan = buildKogPublishOps(repoDraft as unknown as Record<string, unknown>)
    expect(plan.ok).toBe(true)
    if (!plan.ok) {
      return
    }
    expect(plan.ops).toHaveLength(2)
    const [configMapOp, restDefOp] = plan.ops
    expect(configMapOp).toMatchObject({
      gvr: { group: '', resource: 'configmaps', version: 'v1' },
      name: 'repo-oas',
      namespace: 'krateo-system',
      verb: 'POST',
    })
    // name/namespace/key are derived FROM the oasPath — they can never drift apart
    expect(configMapOp.payload).toEqual({
      apiVersion: 'v1',
      data: { 'openapi.yaml': { $oasAttachment: true } },
      kind: 'ConfigMap',
      metadata: { labels: KOG_MANAGED_BY_LABEL, name: 'repo-oas', namespace: 'krateo-system' },
    })
    expect(restDefOp).toMatchObject({ gvr: REST_DEFINITION_GVR, name: 'repo', namespace: 'krateo-system', verb: 'POST' })
    expect(restDefOp.payload).toBe(repoDraft)
    expect(isApplySetAllowed(plan.ops)).toBe(true)
  })

  it('an invalid draft builds NOTHING (all-or-nothing) and returns the validation errors', () => {
    const plan = buildKogPublishOps(withDraft((draft) => {
      draft.spec.oasPath = 'ftp://nope'
    }))
    expect(plan.ok).toBe(false)
    if (plan.ok) {
      return
    }
    expect(plan.errors).toContainEqual(expect.stringContaining('spec.oasPath must be configmap://'))
  })
})
