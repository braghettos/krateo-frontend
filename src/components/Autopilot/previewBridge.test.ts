/**
 * Wave-4 preview bridge — pure-logic coverage (no RTL/jsdom), matching the repo's
 * other Autopilot tests:
 *   - the three arg guards DENY malformed proposals (null) and accept the contract;
 *   - callHelmRender maps request→response and resolves EVERY failure mode into
 *     `{error}` content (an {error} body, a non-2xx status, an unreachable service);
 *   - previewRestDef's summary extraction parses verbs/paths from a CR fixture.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PortalActionProposal } from './actionBridge'
import {
  buildPagePreviewPayload,
  buildRestDefPreviewPayload,
  callHelmRender,
  chartDisplayName,
  extractRestDefSummary,
  parseBlueprintPreviewArgs,
  parsePagePreviewArgs,
  parseRestDefPreviewArgs,
  toYamlString,
} from './previewBridge'

const asProposal = (extra: Record<string, unknown>): PortalActionProposal =>
  ({ verb: 'previewBlueprint', ...extra } as PortalActionProposal)

/** The RestDefinition draft fixture (the ogen.krateo.io shape the KOG builder emits). */
const restDefFixture = {
  apiVersion: 'ogen.krateo.io/v1alpha1',
  kind: 'RestDefinition',
  metadata: { name: 'gh-repo', namespace: 'krateo-system' },
  spec: {
    oasPath: 'configmap://krateo-system/gh-oas/openapi.yaml',
    resource: {
      identifiers: ['id', 'name'],
      kind: 'Repo',
      verbsDescription: [
        { action: 'create', method: 'POST', path: '/orgs/{org}/repos' },
        { action: 'get', method: 'get', path: '/repos/{owner}/{repo}' },
        { action: 'delete', method: 'DELETE', path: '/repos/{owner}/{repo}' },
      ],
    },
    resourceGroup: 'github.ogen.krateo.io',
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('parseBlueprintPreviewArgs — {chart:{url,version?,repo?}, values?}', () => {
  it('accepts a minimal chart ref and a full one', () => {
    expect(parseBlueprintPreviewArgs(asProposal({ chart: { url: 'oci://ghcr.io/x/aws-vpc' } })))
      .toEqual({ chart: { url: 'oci://ghcr.io/x/aws-vpc' } })
    expect(parseBlueprintPreviewArgs(asProposal({
      chart: { repo: 'https://charts.example.io', url: 'aws-vpc', version: '1.2.3' },
      values: { region: 'eu-central-1' },
    }))).toEqual({
      chart: { repo: 'https://charts.example.io', url: 'aws-vpc', version: '1.2.3' },
      values: { region: 'eu-central-1' },
    })
  })

  it('denies a missing/malformed chart or a non-object values (null)', () => {
    expect(parseBlueprintPreviewArgs(asProposal({}))).toBeNull()
    expect(parseBlueprintPreviewArgs(asProposal({ chart: 'oci://x' }))).toBeNull()
    expect(parseBlueprintPreviewArgs(asProposal({ chart: { url: '' } }))).toBeNull()
    expect(parseBlueprintPreviewArgs(asProposal({ chart: { url: 'x', version: 3 } }))).toBeNull()
    expect(parseBlueprintPreviewArgs(asProposal({ chart: { url: 'x' }, values: ['not-an-object'] }))).toBeNull()
  })
})

describe('parsePagePreviewArgs — {widgets:[<widget CR objects>]}', () => {
  it('accepts a non-empty list of kind-carrying CR objects', () => {
    const widgets = [
      { apiVersion: 'widgets.templates.krateo.io/v1beta1', kind: 'Flex', metadata: { name: 'page-root' } },
      { kind: 'Table', metadata: { name: 'rows', namespace: 'krateo-system' } },
    ]
    expect(parsePagePreviewArgs(asProposal({ widgets }))).toEqual(widgets)
  })

  it('denies an empty list, a non-array, and a kind-less entry', () => {
    expect(parsePagePreviewArgs(asProposal({}))).toBeNull()
    expect(parsePagePreviewArgs(asProposal({ widgets: [] }))).toBeNull()
    expect(parsePagePreviewArgs(asProposal({ widgets: 'Flex' }))).toBeNull()
    expect(parsePagePreviewArgs(asProposal({ widgets: [{ metadata: { name: 'no-kind' } }] }))).toBeNull()
    expect(parsePagePreviewArgs(asProposal({ widgets: [{ kind: 'Flex' }, 'not-an-object'] }))).toBeNull()
  })
})

describe('parseRestDefPreviewArgs — {restDefinition: object}', () => {
  it('accepts a CR draft object and denies non-objects / empty objects', () => {
    expect(parseRestDefPreviewArgs(asProposal({ restDefinition: restDefFixture }))).toEqual(restDefFixture)
    expect(parseRestDefPreviewArgs(asProposal({}))).toBeNull()
    expect(parseRestDefPreviewArgs(asProposal({ restDefinition: 'kind: RestDefinition' }))).toBeNull()
    expect(parseRestDefPreviewArgs(asProposal({ restDefinition: {} }))).toBeNull()
  })
})

describe('chartDisplayName', () => {
  it('takes the last URL segment and strips archive suffixes', () => {
    expect(chartDisplayName('oci://ghcr.io/krateoplatformops/aws-vpc')).toBe('aws-vpc')
    expect(chartDisplayName('https://charts.example.io/postgres-1.2.3.tgz')).toBe('postgres-1.2.3')
    expect(chartDisplayName('plain-chart')).toBe('plain-chart')
  })
})

describe('callHelmRender — the render-service transport seam', () => {
  const chartArgs = { chart: { url: 'oci://ghcr.io/x/aws-vpc', version: '1.0.0' }, values: { cidr: '10.0.0.0/16' } }

  const stubFetch = (impl: (...args: unknown[]) => unknown) => {
    const fetchMock = vi.fn(impl)
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('POSTs {chart, values} to <base>/render and normalizes the returned objects', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({
      json: () => Promise.resolve({
        objects: [
          { apiVersion: 'apps/v1', kind: 'Deployment', name: 'web', namespace: 'demo', yaml: 'kind: Deployment' },
          { name: 'anonymous' },
        ],
        valuesSchema: { type: 'object' },
      }),
      ok: true,
      status: 200,
    }))
    // trailing slash on the base URL is normalized away
    const result = await callHelmRender('http://render.local/', chartArgs)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://render.local/render')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ chart: chartArgs.chart, values: chartArgs.values })
    expect(result.error).toBeUndefined()
    expect(result.valuesSchema).toEqual({ type: 'object' })
    expect(result.objects).toEqual([
      { apiVersion: 'apps/v1', kind: 'Deployment', name: 'web', namespace: 'demo', yaml: 'kind: Deployment' },
      // a shapeless entry still previews: kind falls back, its own JSON becomes the YAML
      { kind: 'Object', name: 'anonymous', yaml: toYamlString({ name: 'anonymous' }) },
    ])
  })

  it('surfaces a 200 {error} body as content — a bad chart is data', async () => {
    stubFetch(() => Promise.resolve({
      json: () => Promise.resolve({ error: 'template: aws-vpc/templates/vpc.yaml: required value missing' }),
      ok: true,
      status: 200,
    }))
    const result = await callHelmRender('http://render.local', chartArgs)
    expect(result.error).toContain('required value missing')
    expect(result.objects).toEqual([])
  })

  it('surfaces a non-2xx {error} body, and a body-less failure as the status code', async () => {
    stubFetch(() => Promise.resolve({
      json: () => Promise.resolve({ error: 'chart not found' }),
      ok: false,
      status: 400,
    }))
    expect((await callHelmRender('http://render.local', chartArgs)).error).toBe('chart not found')

    stubFetch(() => Promise.resolve({
      json: () => Promise.reject(new Error('no body')),
      ok: false,
      status: 503,
    }))
    expect((await callHelmRender('http://render.local', chartArgs)).error).toBe('render service responded 503')
  })

  it('resolves (never rejects) when the service is unreachable', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    const result = await callHelmRender('http://render.local', chartArgs)
    expect(result.error).toContain('render service unreachable')
    expect(result.error).toContain('Failed to fetch')
    expect(result.objects).toEqual([])
  })

  it('forwards the session Bearer when a token exists, and omits it gracefully otherwise', async () => {
    const fetchMock = stubFetch(() => Promise.resolve({ json: () => Promise.resolve({ objects: [] }), ok: true, status: 200 }))
    // no localStorage in the node test env → getAccessToken throws → header omitted
    await callHelmRender('http://render.local', chartArgs)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined()
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })
})

describe('previewPage payload — honest source preview', () => {
  it('builds one YAML object entry per proposed widget CR (zero network by construction)', () => {
    const widgets = [
      { apiVersion: 'widgets.templates.krateo.io/v1beta1', kind: 'Flex', metadata: { name: 'page-root', namespace: 'krateo-system' }, spec: { widgetData: { items: [] } } },
      { kind: 'Table', metadata: { name: 'rows' } },
    ]
    const payload = buildPagePreviewPayload(widgets)
    expect(payload.title).toBe('Page preview — 2 proposed widgets')
    expect(payload.caption).toContain('Source preview')
    expect(payload.objects).toHaveLength(2)
    expect(payload.objects?.[0]).toMatchObject({ apiVersion: 'widgets.templates.krateo.io/v1beta1', kind: 'Flex', name: 'page-root', namespace: 'krateo-system' })
    expect(payload.objects?.[0].yaml).toContain('kind: Flex')
    expect(payload.objects?.[1]).toMatchObject({ kind: 'Table', name: 'rows' })
  })
})

describe('previewRestDef summary — mapped verbs/paths parsed client-side', () => {
  it('extracts kind/group, one line per verb, and the identifiers from the fixture', () => {
    const summary = extractRestDefSummary(restDefFixture)
    expect(summary).toEqual([
      'kind: Repo',
      'group: github.ogen.krateo.io',
      'create · POST /orgs/{org}/repos',
      'get · GET /repos/{owner}/{repo}',
      'delete · DELETE /repos/{owner}/{repo}',
      'identifiers: id, name',
    ])
  })

  it('says "no verbs mapped" for a draft without verbsDescription (data, not a crash)', () => {
    expect(extractRestDefSummary({ spec: { resource: { kind: 'Repo' } } })).toEqual(['kind: Repo', 'no verbs mapped'])
    expect(extractRestDefSummary({})).toEqual(['no verbs mapped'])
  })

  it('builds the full drawer payload: title, summary, and the draft YAML', () => {
    const payload = buildRestDefPreviewPayload(restDefFixture)
    expect(payload.title).toBe('RestDefinition preview — gh-repo')
    expect(payload.summary).toContain('create · POST /orgs/{org}/repos')
    expect(payload.objects).toHaveLength(1)
    expect(payload.objects?.[0]).toMatchObject({ kind: 'RestDefinition', name: 'gh-repo', namespace: 'krateo-system' })
    expect(payload.objects?.[0].yaml).toContain('kind: RestDefinition')
    expect(payload.objects?.[0].yaml).toContain('resourceGroup: github.ogen.krateo.io')
  })

  it('FE-K1 wiring: the payload carries validation problems + immutability warnings', () => {
    // the fixture's `get` verb uses a lowercase method — a REAL live-CRD enum violation
    const payload = buildRestDefPreviewPayload(restDefFixture)
    expect(payload.problems).toEqual([expect.stringContaining('method must be one of GET|POST|PUT|DELETE|PATCH')])
    expect(payload.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('immutable once generated: resource.kind (Repo)'),
      expect.stringContaining('immutable once generated: resourceGroup (github.ogen.krateo.io)'),
      expect.stringContaining('immutable once generated: identifiers (id, name)'),
    ]))
    // a fully valid draft carries NO problems key (the drawer shows no error Alert)
    const valid = JSON.parse(JSON.stringify(restDefFixture)) as typeof restDefFixture
    valid.spec.resource.verbsDescription[1].method = 'GET'
    expect(buildRestDefPreviewPayload(valid).problems).toBeUndefined()
  })
})
