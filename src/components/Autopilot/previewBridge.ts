/**
 * Wave-4 preview bridge — the PURE helpers behind the three read-only preview verbs
 * (previewBlueprint / previewPage / previewRestDef). No React, no registry entries
 * here: argument guards (a malformed proposal is DENIED — null — never a crash), the
 * helm-render transport seam, and the payload builders for the preview drawer.
 *
 * previewBlueprint transport contract (helm-render-service, POST /render): the body
 * carries EXACTLY ONE chart source — {chart:{url,version?,repo?}} (remote mode) OR
 * {rawTemplates:{"<path>":"<content>"}} (FE-B1 inline-draft mode, previewing a chart
 * that has no URL yet) — plus {values} → 200 {objects:[{apiVersion,kind,name,
 * namespace,yaml}], valuesSchema?, error?}. A response carrying {error} is CONTENT (a
 * bad chart is data — the drawer shows the error string); an unreachable/failed
 * service is likewise surfaced as preview text, never a throw.
 */
import { dump } from 'js-yaml'

import { getAccessToken } from '../../utils/getAccessToken'

import type { PortalActionProposal } from './actionBridge'
import { parseRawTemplates } from './blueprintDraft'
import { restDefImmutabilityWarnings, validateRestDefinitionDraft } from './kogMapping'
import type { AutopilotPreviewPayload, PreviewObjectEntry } from './previewBus'

/** The chart coordinates previewBlueprint sends to the render service. */
export interface BlueprintChartRef {
  url: string
  version?: string
  repo?: string
}

/** Exactly ONE of `chart` (remote mode) | `rawTemplates` (FE-B1 inline-draft mode) —
 * the parser guarantees the invariant; a proposal carrying both or neither is denied. */
export interface BlueprintPreviewArgs {
  chart?: BlueprintChartRef
  rawTemplates?: Record<string, string>
  values?: Record<string, unknown>
}

/** The normalized outcome of a render call: content objects OR an error string (data). */
export interface HelmRenderResult {
  error?: string
  objects: PreviewObjectEntry[]
  valuesSchema?: unknown
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  (value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null)

const optionalString = (value: unknown): boolean => value === undefined || typeof value === 'string'

/**
 * previewBlueprint args — EXACTLY ONE chart source, matching the render service's own
 * exactly-one-of contract: {chart:{url, version?, repo?}} (remote) XOR
 * {rawTemplates:{"<path>":"<content>"}} (inline draft, FE-B1), plus optional
 * {values: object}. Both sources, neither, or a malformed one = null (denied).
 */
export const parseBlueprintPreviewArgs = (proposal: PortalActionProposal): BlueprintPreviewArgs | null => {
  if (proposal.chart !== undefined && proposal.rawTemplates !== undefined) {
    return null
  }
  const values = proposal.values === undefined ? undefined : asRecord(proposal.values)
  if (proposal.values !== undefined && !values) {
    return null
  }
  if (proposal.rawTemplates !== undefined) {
    const rawTemplates = parseRawTemplates(proposal.rawTemplates)
    if (!rawTemplates) {
      return null
    }
    return { rawTemplates, ...(values ? { values } : {}) }
  }
  const chart = asRecord(proposal.chart)
  if (!chart || typeof chart.url !== 'string' || !chart.url.trim() || !optionalString(chart.version) || !optionalString(chart.repo)) {
    return null
  }
  return {
    chart: {
      url: chart.url,
      ...(typeof chart.version === 'string' && chart.version ? { version: chart.version } : {}),
      ...(typeof chart.repo === 'string' && chart.repo ? { repo: chart.repo } : {}),
    },
    ...(values ? { values } : {}),
  }
}

/** previewPage args: {widgets:[<widget CR objects>]} — each entry MUST at least carry a
 * widget `kind`; anything else (empty list, a non-object, a kind-less blob) is denied. */
export const parsePagePreviewArgs = (proposal: PortalActionProposal): Record<string, unknown>[] | null => {
  const { widgets } = proposal
  if (!Array.isArray(widgets) || widgets.length === 0) {
    return null
  }
  const parsed: Record<string, unknown>[] = []
  for (const entry of widgets) {
    const cr = asRecord(entry)
    if (!cr || typeof cr.kind !== 'string' || !cr.kind.trim()) {
      return null
    }
    parsed.push(cr)
  }
  return parsed
}

/** previewRestDef args: {restDefinition: <RestDefinition CR draft object>}. Null = denied. */
export const parseRestDefPreviewArgs = (proposal: PortalActionProposal): Record<string, unknown> | null => {
  const restDefinition = asRecord(proposal.restDefinition)
  if (!restDefinition || Object.keys(restDefinition).length === 0) {
    return null
  }
  return restDefinition
}

/** A human-readable chart name from its URL (last path segment, archive suffix stripped). */
export const chartDisplayName = (url: string): string => {
  const last = url.replace(/\/+$/, '').split('/')
    .pop() ?? url
  return last.replace(/\.(tgz|tar\.gz)$/i, '') || url
}

/** Serialize a CR draft to YAML for the preview drawer; never throws (a draft is data). */
export const toYamlString = (value: unknown): string => {
  try {
    return dump(value, { lineWidth: 120, noRefs: true })
  } catch {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }
}

const metadataOf = (cr: Record<string, unknown>): { name?: string; namespace?: string } => {
  const metadata = asRecord(cr.metadata)
  return {
    ...(typeof metadata?.name === 'string' && metadata.name ? { name: metadata.name } : {}),
    ...(typeof metadata?.namespace === 'string' && metadata.namespace ? { namespace: metadata.namespace } : {}),
  }
}

/** The Bearer of the logged-in session, forwarded so the render service can pull private
 * charts. Best-effort: no token (or no localStorage in tests) → no header, never a throw. */
const authHeader = (): Record<string, string> => {
  try {
    return { Authorization: `Bearer ${getAccessToken()}` }
  } catch {
    return {}
  }
}

const normalizeRenderedObject = (entry: unknown): PreviewObjectEntry => {
  const record = asRecord(entry) ?? {}
  return {
    ...(typeof record.apiVersion === 'string' && record.apiVersion ? { apiVersion: record.apiVersion } : {}),
    kind: typeof record.kind === 'string' && record.kind ? record.kind : 'Object',
    ...(typeof record.name === 'string' && record.name ? { name: record.name } : {}),
    ...(typeof record.namespace === 'string' && record.namespace ? { namespace: record.namespace } : {}),
    yaml: typeof record.yaml === 'string' ? record.yaml : toYamlString(entry),
  }
}

/** The render CONTRACT body — `{objects, valuesSchema?, error?}` — as produced by BOTH
 * transports: the direct render service (`callHelmRender`, the response JSON) and the
 * server-side RA (`callBlueprintRenderRA`, the RESTAction's resolved `.status`). The RA
 * jq filter emits EXACTLY this shape, so one normalizer serves both. */
interface RenderContractBody { error?: unknown; objects?: unknown; valuesSchema?: unknown }

/** Normalize the shared `{objects, valuesSchema?, error?}` contract body into a
 * HelmRenderResult. An `{error}` string is CONTENT (a bad chart is data → objects:[]);
 * otherwise the objects list (+ valuesSchema when present). Never throws. */
const toHelmRenderResult = (body: RenderContractBody | null): HelmRenderResult => {
  if (typeof body?.error === 'string' && body.error) {
    return { error: body.error, objects: [] }
  }
  const objects = Array.isArray(body?.objects) ? body.objects.map(normalizeRenderedObject) : []
  return { objects, ...(body?.valuesSchema === undefined ? {} : { valuesSchema: body.valuesSchema }) }
}

/** Serialize the previewBlueprint args into the RA's `?extras` envelope — the SAME
 * exactly-one-of source contract, forwarded by snowplow into the RA's jq dict, where the
 * `blueprint-render` payload step rebuilds the render service body server-side. Exactly
 * ONE of `chart` | `rawTemplates` (the parser guarantees it), plus `values` (default {}). */
export const buildBlueprintRenderExtras = (args: BlueprintPreviewArgs): string =>
  JSON.stringify({
    ...(args.rawTemplates ? { rawTemplates: args.rawTemplates } : { chart: args.chart }),
    values: args.values ?? {},
  })

/**
 * POST the chart source + values to the render service and normalize the response —
 * remote mode sends {chart}, inline-draft mode sends {rawTemplates} (the service's
 * exactly-one-of contract). EVERY failure mode resolves (never rejects): a {error}
 * body, a non-2xx status, and an unreachable service all come back as `{error}` — the
 * drawer shows the string as the preview content. The caller decides nothing about
 * transport.
 *
 * NOTE: this is the LEGACY direct-fetch transport (config api.RENDER_API_BASE_URL). The
 * render service is ClusterIP-only and should NOT be browser-exposed, so the preferred
 * path is `callBlueprintRenderRA` (server-side via snowplow). This is kept as the
 * config-absent fallback for installs that still expose the render service directly.
 */
export const callHelmRender = async (renderBaseUrl: string, args: BlueprintPreviewArgs): Promise<HelmRenderResult> => {
  try {
    const response = await fetch(`${renderBaseUrl.replace(/\/+$/, '')}/render`, {
      body: JSON.stringify({
        ...(args.rawTemplates ? { rawTemplates: args.rawTemplates } : { chart: args.chart }),
        values: args.values ?? {},
      }),
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      method: 'POST',
    })
    const body = await response.json().catch(() => null) as RenderContractBody | null
    // A non-2xx WITHOUT an {error} body is the only transport-specific case (the RA path
    // has no equivalent — snowplow answers 200 with the {error} in .status). Everything
    // else flows through the shared contract normalizer.
    if (!(typeof body?.error === 'string' && body.error) && !response.ok) {
      return { error: `render service responded ${response.status}`, objects: [] }
    }
    return toHelmRenderResult(body)
  } catch (error) {
    return { error: `render service unreachable — ${error instanceof Error ? error.message : String(error)}`, objects: [] }
  }
}

/**
 * Render a blueprint through the snowplow `blueprint-render` RESTAction — the SAME
 * transport a widget uses (`GET ${snowplowBaseUrl}/call?resource=restactions&...` with
 * the user's Bearer), so the ClusterIP-only render service is NEVER browser-exposed:
 * snowplow POSTs it in-cluster via the RA's endpointRef and returns the shaped result in
 * the RESTAction's resolved `.status`.
 *
 * The previewBlueprint args ride in `?extras` (the exactly-one-of chart source + values);
 * the response is the resolved RESTAction CR whose `.status` is the render contract body
 * `{objects, valuesSchema?, error?}` (snowplow places a RESTAction's jq filter output
 * directly in `.status`). EVERY failure mode resolves into `{error}` content — never a
 * throw — exactly like `callHelmRender`, so the drawer path is identical.
 */
export const callBlueprintRenderRA = async (
  snowplowBaseUrl: string,
  namespace: string,
  args: BlueprintPreviewArgs,
): Promise<HelmRenderResult> => {
  try {
    const url = new URL(`${snowplowBaseUrl.replace(/\/+$/, '')}/call`)
    url.searchParams.set('resource', 'restactions')
    url.searchParams.set('apiVersion', 'templates.krateo.io/v1')
    url.searchParams.set('name', 'blueprint-render')
    url.searchParams.set('namespace', namespace)
    url.searchParams.set('extras', buildBlueprintRenderExtras(args))
    const response = await fetch(url.toString(), { headers: { ...authHeader() } })
    if (!response.ok) {
      // A RA transport failure (RBAC 403, the RA not installed 404, snowplow 5xx) — the
      // render service {error} would have been a 200 with .status.error, so a non-2xx here
      // is genuinely the RA path failing. Surface it as content, never a throw.
      return { error: `blueprint-render RESTAction responded ${response.status}`, objects: [] }
    }
    // snowplow resolves a RESTAction with its jq filter output placed DIRECTLY in .status
    // (not .status.widgetData — that is the widget shape). The filter emits the render
    // contract body verbatim.
    const cr = await response.json().catch(() => null) as { status?: unknown } | null
    const status = asRecord(cr?.status) as RenderContractBody | null
    return toHelmRenderResult(status)
  } catch (error) {
    return { error: `blueprint-render RESTAction unreachable — ${error instanceof Error ? error.message : String(error)}`, objects: [] }
  }
}

/** Why previewPage is a SOURCE preview (see previewHandlers.ts for the full rationale). */
export const PAGE_PREVIEW_CAPTION
  = 'Source preview — the proposed widget CRs exactly as they would be submitted. Nothing is applied; live in-page rendering of drafts is a follow-up.'

export const buildPagePreviewPayload = (widgets: Record<string, unknown>[]): AutopilotPreviewPayload => ({
  caption: PAGE_PREVIEW_CAPTION,
  objects: widgets.map((widget) => ({
    kind: String(widget.kind),
    ...metadataOf(widget),
    ...(typeof widget.apiVersion === 'string' && widget.apiVersion ? { apiVersion: widget.apiVersion } : {}),
    yaml: toYamlString(widget),
  })),
  title: `Page preview — ${widgets.length} proposed widget${widgets.length === 1 ? '' : 's'}`,
})

/**
 * The mapped verbs/paths of a RestDefinition draft, extracted by PURE client-side
 * parsing (no network, no crdgen): kind + group headlines, one `action · METHOD path`
 * line per verbsDescription entry, and the identifiers. Missing pieces surface as
 * explicit placeholders — an incomplete draft is data, not an error.
 */
export const extractRestDefSummary = (restDefinition: Record<string, unknown>): string[] => {
  const spec = asRecord(restDefinition.spec)
  const resource = asRecord(spec?.resource)
  const lines: string[] = []
  if (typeof resource?.kind === 'string' && resource.kind) {
    lines.push(`kind: ${resource.kind}`)
  }
  if (typeof spec?.resourceGroup === 'string' && spec.resourceGroup) {
    lines.push(`group: ${spec.resourceGroup}`)
  }
  const verbs = Array.isArray(resource?.verbsDescription) ? resource.verbsDescription : []
  let mapped = 0
  for (const entry of verbs) {
    const verb = asRecord(entry)
    if (!verb) {
      continue
    }
    const action = typeof verb.action === 'string' && verb.action ? verb.action : '(action?)'
    const method = typeof verb.method === 'string' && verb.method ? verb.method.toUpperCase() : '(method?)'
    const path = typeof verb.path === 'string' && verb.path ? verb.path : '(path?)'
    lines.push(`${action} · ${method} ${path}`)
    mapped += 1
  }
  if (!mapped) {
    lines.push('no verbs mapped')
  }
  const identifiers = Array.isArray(resource?.identifiers)
    ? resource.identifiers.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : []
  if (identifiers.length) {
    lines.push(`identifiers: ${identifiers.join(', ')}`)
  }
  return lines
}

export const REST_DEF_PREVIEW_CAPTION
  = 'Source preview — the RestDefinition draft, its mapped verbs/paths, and its validation against the RestDefinition CRD (all client-side; nothing touches the cluster).'

export const buildRestDefPreviewPayload = (restDefinition: Record<string, unknown>): AutopilotPreviewPayload => {
  const identity = metadataOf(restDefinition)
  // FE-K1: validate the draft against the LIVE CRD shape and surface the CEL-immutable
  // fields — the preview drawer is exactly where the user decides whether to publish,
  // so validation errors ("this would be rejected") and immutability warnings ("you
  // cannot change these later") belong HERE, before the gated write is even proposed.
  const problems = validateRestDefinitionDraft(restDefinition)
  const warnings = restDefImmutabilityWarnings(restDefinition)
  return {
    caption: REST_DEF_PREVIEW_CAPTION,
    objects: [{
      kind: typeof restDefinition.kind === 'string' && restDefinition.kind ? restDefinition.kind : 'RestDefinition',
      ...identity,
      yaml: toYamlString(restDefinition),
    }],
    ...(problems.length ? { problems } : {}),
    summary: extractRestDefSummary(restDefinition),
    title: `RestDefinition preview${identity.name ? ` — ${identity.name}` : ''}`,
    ...(warnings.length ? { warnings } : {}),
  }
}
