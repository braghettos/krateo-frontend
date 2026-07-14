/**
 * Wave-4 preview verbs — pure-logic coverage (no RTL/jsdom). The drawer surface is
 * mocked at the previewBus seam, so these tests assert exactly what each verb DOES:
 *   - all three are registered read-only entries (deny-by-default preserved);
 *   - malformed args are denied (null) with no fetch and no drawer;
 *   - previewBlueprint with NO renderBaseUrl → the graceful "unavailable" chip, ZERO
 *     network; with one → POST + drawer (objects, or the render error as content);
 *   - previewPage / previewRestDef never touch the network at all.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortalActionProposal } from './actionBridge'
import type { AutopilotPreviewPayload } from './previewBus'
import { openAutopilotPreview } from './previewBus'
import { previewBlueprintSpec, previewPageSpec, previewRestDefSpec, RENDER_UNAVAILABLE_LABEL } from './previewHandlers'
import { isReadOnlyVerb, READONLY_VERB_REGISTRY, type VerbDeps } from './verbRegistry'

vi.mock('./previewBus', () => ({ openAutopilotPreview: vi.fn() }))

const openPreviewMock = vi.mocked(openAutopilotPreview)

const makeDeps = (renderBaseUrl?: string): VerbDeps => ({
  handleAction: vi.fn((): Promise<void> => Promise.resolve()),
  routePatterns: [],
  ...(renderBaseUrl ? { renderBaseUrl } : {}),
})

const asProposal = (verb: string, extra: Record<string, unknown>): PortalActionProposal =>
  ({ verb, ...extra } as PortalActionProposal)

/** The payload the (mocked) drawer was opened with on the first call. */
const openedPayload = (): AutopilotPreviewPayload => openPreviewMock.mock.calls[0][0]

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('registry — the three preview verbs are read-only entries', () => {
  it('registers previewBlueprint / previewPage / previewRestDef, all sideEffect:read', () => {
    for (const verb of ['previewBlueprint', 'previewPage', 'previewRestDef']) {
      expect(READONLY_VERB_REGISTRY[verb]).toBeDefined()
      expect(READONLY_VERB_REGISTRY[verb].sideEffect).toBe('read')
      expect(isReadOnlyVerb(verb)).toBe(true)
    }
  })
})

describe('previewBlueprint', () => {
  const chart = { url: 'oci://ghcr.io/x/aws-vpc', version: '1.0.0' }

  it('denies malformed args (no chart / empty url): null, no fetch, no drawer', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const deps = makeDeps('http://render.local')
    expect(previewBlueprintSpec.argSchema(asProposal('previewBlueprint', {}))).toBe(false)
    expect(await previewBlueprintSpec.apply(asProposal('previewBlueprint', {}), deps)).toBeNull()
    expect(await previewBlueprintSpec.apply(asProposal('previewBlueprint', { chart: { url: '' } }), deps)).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(openPreviewMock).not.toHaveBeenCalled()
  })

  it('returns the graceful "unavailable" chip when renderBaseUrl is unset — ZERO network', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const chip = await previewBlueprintSpec.apply(asProposal('previewBlueprint', { chart }), makeDeps())
    expect(chip).toEqual({ label: RENDER_UNAVAILABLE_LABEL, readOnly: true, verb: 'previewBlueprint' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(openPreviewMock).not.toHaveBeenCalled()
  })

  it('happy path: POSTs to <base>/render and opens the drawer with the rendered objects', async () => {
    const fetchMock = vi.fn((..._args: unknown[]) => Promise.resolve({
      json: () => Promise.resolve({
        objects: [{ apiVersion: 'apps/v1', kind: 'Deployment', name: 'web', namespace: 'demo', yaml: 'kind: Deployment' }],
      }),
      ok: true,
      status: 200,
    }))
    vi.stubGlobal('fetch', fetchMock)
    const chip = await previewBlueprintSpec.apply(
      asProposal('previewBlueprint', { chart, values: { cidr: '10.0.0.0/16' } }),
      makeDeps('http://render.local'),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('http://render.local/render')
    expect(openPreviewMock).toHaveBeenCalledTimes(1)
    const payload = openedPayload()
    expect(payload.title).toBe('Blueprint preview — aws-vpc')
    expect(payload.error).toBeUndefined()
    expect(payload.objects).toEqual([{ apiVersion: 'apps/v1', kind: 'Deployment', name: 'web', namespace: 'demo', yaml: 'kind: Deployment' }])
    expect(chip).toEqual({ label: 'preview aws-vpc (1 object)', readOnly: true, verb: 'previewBlueprint' })
  })

  it('a render {error} is shown AS the preview content — a bad chart is data', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ error: 'template: vpc.yaml: required value missing' }),
      ok: true,
      status: 200,
    })))
    const chip = await previewBlueprintSpec.apply(asProposal('previewBlueprint', { chart }), makeDeps('http://render.local'))
    expect(openPreviewMock).toHaveBeenCalledTimes(1)
    expect(openedPayload().error).toBe('template: vpc.yaml: required value missing')
    expect(chip).toEqual({ label: 'preview aws-vpc (render failed)', readOnly: true, verb: 'previewBlueprint' })
  })

  it('honors the proposal label on the chip', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ objects: [] }), ok: true, status: 200 })))
    const chip = await previewBlueprintSpec.apply(
      asProposal('previewBlueprint', { chart, label: 'previewed the VPC blueprint' }),
      makeDeps('http://render.local'),
    )
    expect(chip?.label).toBe('previewed the VPC blueprint')
  })
})

describe('previewPage — honest source preview, zero network', () => {
  const widgets = [
    { apiVersion: 'widgets.templates.krateo.io/v1beta1', kind: 'Flex', metadata: { name: 'page-root', namespace: 'krateo-system' } },
    { kind: 'Table', metadata: { name: 'rows' } },
  ]

  it('opens the drawer with one YAML entry per proposed widget CR — and NEVER fetches', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const chip = await previewPageSpec.apply(asProposal('previewPage', { widgets }), makeDeps('http://render.local'))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(openPreviewMock).toHaveBeenCalledTimes(1)
    const payload = openedPayload()
    expect(payload.objects).toHaveLength(2)
    expect(payload.objects?.[0]).toMatchObject({ kind: 'Flex', name: 'page-root', namespace: 'krateo-system' })
    expect(payload.caption).toContain('Source preview')
    expect(chip).toEqual({ label: 'preview page (2 widgets)', readOnly: true, verb: 'previewPage' })
  })

  it('denies malformed args (empty list / kind-less entry): null, no drawer', async () => {
    const deps = makeDeps()
    expect(previewPageSpec.argSchema(asProposal('previewPage', { widgets: [] }))).toBe(false)
    expect(await previewPageSpec.apply(asProposal('previewPage', { widgets: [] }), deps)).toBeNull()
    expect(await previewPageSpec.apply(asProposal('previewPage', { widgets: [{ metadata: {} }] }), deps)).toBeNull()
    expect(await previewPageSpec.apply(asProposal('previewPage', {}), deps)).toBeNull()
    expect(openPreviewMock).not.toHaveBeenCalled()
  })
})

describe('previewRestDef — structured source preview, zero network', () => {
  const restDefinition = {
    apiVersion: 'ogen.krateo.io/v1alpha1',
    kind: 'RestDefinition',
    metadata: { name: 'gh-repo', namespace: 'krateo-system' },
    spec: {
      resource: {
        kind: 'Repo',
        verbsDescription: [
          { action: 'create', method: 'POST', path: '/orgs/{org}/repos' },
          { action: 'get', method: 'GET', path: '/repos/{owner}/{repo}' },
        ],
      },
      resourceGroup: 'github.ogen.krateo.io',
    },
  }

  it('opens the drawer with the draft YAML + the mapped verbs/paths summary — no fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const chip = await previewRestDefSpec.apply(asProposal('previewRestDef', { restDefinition }), makeDeps())
    expect(fetchMock).not.toHaveBeenCalled()
    expect(openPreviewMock).toHaveBeenCalledTimes(1)
    const payload = openedPayload()
    expect(payload.title).toBe('RestDefinition preview — gh-repo')
    expect(payload.summary).toEqual([
      'kind: Repo',
      'group: github.ogen.krateo.io',
      'create · POST /orgs/{org}/repos',
      'get · GET /repos/{owner}/{repo}',
    ])
    expect(payload.objects?.[0].yaml).toContain('kind: RestDefinition')
    expect(chip).toEqual({ label: 'RestDefinition preview — gh-repo', readOnly: true, verb: 'previewRestDef' })
  })

  it('denies malformed args (missing / non-object / empty draft): null, no drawer', async () => {
    const deps = makeDeps()
    expect(previewRestDefSpec.argSchema(asProposal('previewRestDef', {}))).toBe(false)
    expect(await previewRestDefSpec.apply(asProposal('previewRestDef', {}), deps)).toBeNull()
    expect(await previewRestDefSpec.apply(asProposal('previewRestDef', { restDefinition: 'kind: RestDefinition' }), deps)).toBeNull()
    expect(await previewRestDefSpec.apply(asProposal('previewRestDef', { restDefinition: {} }), deps)).toBeNull()
    expect(openPreviewMock).not.toHaveBeenCalled()
  })
})
