/**
 * Wave-4 preview verbs (W0-1 extension seam) — THREE deny-by-default, READ-ONLY
 * registry entries that mutate NOTHING and auto-apply like navigate. Each shows the
 * user exactly what a builder will produce BEFORE any write, in the shared preview
 * drawer (previewSurface.tsx, opened via the previewBus event). The write that may
 * follow still goes through useHandleAction + the blast-radius gate — never from here.
 *
 *   - previewBlueprint {chart:{url,version?,repo?}, values?} OR — FE-B1 inline-draft
 *     mode — {rawTemplates:{"<path>":"<content>"}, values?} (exactly ONE source):
 *     renders the chart SERVER-SIDE via the `blueprint-render` RESTAction (fetched over
 *     snowplow `/call`, the SAME transport widgets use — so the ClusterIP-only render
 *     service is never browser-exposed) and lists the rendered child objects; a returned
 *     valuesSchema additionally renders as a read-only "Create form preview" section (the
 *     production SchemaForm — zero extra network). Legacy fallback: a DIRECT browser fetch
 *     to config api.RENDER_API_BASE_URL when the RA transport is unavailable. Inline drafts
 *     pass the FE-B2 crdgen lint FIRST: a values.schema.json carrying a non-empty
 *     object/array default (the core-provider#46 class that wedges CRD generation) — or a
 *     draft over the 512 KiB cap — is a HARD ERROR shown in the drawer, and NOTHING is
 *     fetched. Neither transport available → a graceful "preview unavailable" chip, ZERO
 *     network. A render error is CONTENT (a bad chart is data), shown in the drawer.
 *   - previewPage {widgets:[<widget CR objects>]}: ZERO network — an honest SOURCE
 *     preview (kind/name headline + collapsible YAML per proposed CR). Deliberately
 *     NOT a live render: WidgetRenderer requires a SERVED widgetEndpoint
 *     (useWidgetQuery fetches it), container widgets (Flex/Row/Col/Tabs…) resolve
 *     children through further served endpoints, and a draft CR only has an
 *     UNRESOLVED spec (snowplow compiles spec→status server-side: templates, apiRef
 *     data, resourcesRefs). An in-memory "render" would either fetch (violating
 *     read-only zero-network) or fake the resolution — so the fallback is honest
 *     source, and live draft rendering is a documented follow-up.
 *   - previewRestDef {restDefinition:<CR draft>}: pure client-side parsing — the
 *     draft's YAML plus a summary of the mapped verbs/paths (action · METHOD path),
 *     kind/group and identifiers. No network, no crdgen (v1 = structured source).
 *
 * Malformed args are DENIED (argSchema false / apply → null), matching every other
 * registry verb — never a crash, never a partial dispatch.
 */
import { buildFormSchemaText, DRAFT_REJECTED_CAPTION, draftDisplayName, lintBlueprintDraft } from './blueprintDraft'
import {
  buildPagePreviewPayload,
  buildRestDefPreviewPayload,
  callBlueprintRenderRA,
  callHelmRender,
  chartDisplayName,
  parseBlueprintPreviewArgs,
  parsePagePreviewArgs,
  parseRestDefPreviewArgs,
} from './previewBridge'
import { openAutopilotPreview } from './previewBus'
import { registerReadOnlyVerb, type VerbSpec } from './verbRegistry'

/** The graceful-absence chip label when NEITHER previewBlueprint transport is available
 * (no snowplow RA reachable AND no direct RENDER_API_BASE_URL configured). */
export const RENDER_UNAVAILABLE_LABEL = 'preview unavailable — render service not configured'

/**
 * previewBlueprint → helm-render the chart against the values and show the rendered
 * child objects. Read-only end to end: the render is a dry-run (no cluster write), and
 * every failure mode resolves into drawer content or a chip — no throw.
 *
 * TRANSPORT: PREFER the server-side `blueprint-render` RESTAction (fetched via snowplow
 * `/call`, the same transport widgets use) so the ClusterIP-only render service is NEVER
 * browser-exposed. When the RA transport is unavailable (no snowplow base URL / no
 * frontend namespace) but a direct RENDER_API_BASE_URL IS configured, fall back to the
 * legacy direct browser fetch. When NEITHER is available → the graceful "unavailable"
 * chip, ZERO network.
 */
export const previewBlueprintSpec: VerbSpec = {
  apply: async (proposal, deps) => {
    const args = parseBlueprintPreviewArgs(proposal)
    if (!args) {
      return null
    }
    // The RA transport needs both the snowplow base URL AND the RA's namespace (frontend
    // namespace); a direct render base URL is the fallback. Neither → graceful absence.
    const canUseRA = Boolean(deps.snowplowBaseUrl && deps.frontendNamespace)
    if (!canUseRA && !deps.renderBaseUrl) {
      // Graceful absence: no render path is configured. No fetch, no drawer — just an
      // honest chip saying the preview cannot be produced here.
      return { label: RENDER_UNAVAILABLE_LABEL, readOnly: true, verb: 'previewBlueprint' }
    }
    const name = args.chart ? chartDisplayName(args.chart.url) : draftDisplayName(args.rawTemplates ?? {})
    // FE-B2: inline drafts pass the client-side crdgen lint BEFORE any render fetch —
    // a #46-class schema default (or an over-cap draft) is a HARD ERROR: the drawer
    // shows the verdicts only and NOTHING leaves the browser.
    if (args.rawTemplates) {
      const problems = lintBlueprintDraft(args.rawTemplates)
      if (problems.length) {
        openAutopilotPreview({
          caption: DRAFT_REJECTED_CAPTION,
          problems,
          title: `Blueprint preview — ${name}`,
        })
        return { label: proposal.label ?? `preview ${name} (draft rejected)`, readOnly: true, verb: 'previewBlueprint' }
      }
    }
    // PREFER the RA (server-side render); DIRECT fetch is the config-absent fallback.
    const rendered = canUseRA
      ? await callBlueprintRenderRA(deps.snowplowBaseUrl!, deps.frontendNamespace!, args)
      : await callHelmRender(deps.renderBaseUrl!, args)
    // FE-B1: the create-form half — the raw values.schema.json string (verbatim from
    // the draft file when inline; the response's valuesSchema otherwise) rides the
    // payload and mounts as a read-only SchemaForm section in the drawer.
    const formSchema = buildFormSchemaText(args.rawTemplates, rendered.valuesSchema, rendered.error)
    openAutopilotPreview({
      caption: 'helm-render dry run — nothing is applied to the cluster',
      ...(rendered.error ? { error: rendered.error } : {}),
      ...(formSchema ? { formSchema } : {}),
      objects: rendered.objects,
      title: `Blueprint preview — ${name}`,
    })
    const outcome = rendered.error
      ? 'render failed'
      : `${rendered.objects.length} object${rendered.objects.length === 1 ? '' : 's'}`
    return { label: proposal.label ?? `preview ${name} (${outcome})`, readOnly: true, verb: 'previewBlueprint' }
  },
  argSchema: (proposal) => parseBlueprintPreviewArgs(proposal) !== null,
  name: 'previewBlueprint',
  sideEffect: 'read',
}

/**
 * previewPage → the honest SOURCE preview of the proposed widget CRs (see the module
 * header for why this is not a live render). ZERO network by construction: the
 * payload is built purely from the proposal and handed to the drawer.
 *
 * FE-P4: when config api.PREVIEW_SANDBOX_NAMESPACE is set, the bridge intercepts
 * `previewPage` BEFORE this registry entry and runs the v2 SANDBOX LIVE preview
 * instead (previewPageV2.ts — drafts applied to the quarantined sandbox, rendered
 * through the real widgetEndpoint). This v1 entry is the config-absent fallback and
 * stays byte-identical: read-only, zero network, source drawer.
 */
export const previewPageSpec: VerbSpec = {
  apply: (proposal) => {
    const widgets = parsePagePreviewArgs(proposal)
    if (!widgets) {
      return Promise.resolve(null)
    }
    openAutopilotPreview(buildPagePreviewPayload(widgets))
    const label = proposal.label ?? `preview page (${widgets.length} widget${widgets.length === 1 ? '' : 's'})`
    return Promise.resolve({ label, readOnly: true, verb: 'previewPage' })
  },
  argSchema: (proposal) => parsePagePreviewArgs(proposal) !== null,
  name: 'previewPage',
  sideEffect: 'read',
}

/**
 * previewRestDef → the RestDefinition draft's YAML + a client-side summary of its
 * mapped verbs/paths. Pure parsing, no network; v1 of the KOG-builder preview gate.
 */
export const previewRestDefSpec: VerbSpec = {
  apply: (proposal) => {
    const restDefinition = parseRestDefPreviewArgs(proposal)
    if (!restDefinition) {
      return Promise.resolve(null)
    }
    const payload = buildRestDefPreviewPayload(restDefinition)
    openAutopilotPreview(payload)
    return Promise.resolve({ label: proposal.label ?? payload.title, readOnly: true, verb: 'previewRestDef' })
  },
  argSchema: (proposal) => parseRestDefPreviewArgs(proposal) !== null,
  name: 'previewRestDef',
  sideEffect: 'read',
}

// Seed the preview verbs into the shared read-only registry (one-line entries). This
// runs on module load; actionBridge.ts imports this module so the entries are present
// before any apply() dispatch.
registerReadOnlyVerb(previewBlueprintSpec)
registerReadOnlyVerb(previewPageSpec)
registerReadOnlyVerb(previewRestDefSpec)
