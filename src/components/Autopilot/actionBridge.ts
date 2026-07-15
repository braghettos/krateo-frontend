/**
 * Action bridge (component 6, read-only subset). The GOVERNING INVARIANT: Autopilot
 * never mutates and never reimplements behaviour — it drives the REAL portal by
 * compiling a proposal into a canonical `WidgetAction` and dispatching it through
 * the SAME `useHandleAction` dispatcher a Button/row-action uses.
 *
 * Deny-by-default: only the four read-only verbs are accepted; anything else (a
 * mutating rest, an unknown verb) is rejected here, never executed. The read-only
 * verbs are auto-applied (non-mutating); mutations are Phase 3 (gated by the real
 * control's own confirm).
 *
 * Proposals reach the bridge two ways, both produced by the orchestrator:
 *   - a `propose_portal_action` tool_call frame (the transport surfaces it), or
 *   - a fenced ```portal-action {json}``` block in the assistant text (parsed +
 *     stripped here). The fenced channel needs only a system-prompt addition.
 */

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { type RouteObject } from 'react-router'

import { useConfigContext } from '../../context/ConfigContext'
import { useRoutesContext } from '../../context/RoutesContext'
import type { WriteOrigin } from '../../hooks/provenance'
import { useHandleAction } from '../../hooks/useHandleActions'
import type { ResourcesRefs, WidgetAction } from '../../types/Widget'

// applyResourceSet — the P1 applySet mutating branch (builder/fleet): an ORDERED set of up
// to 10 Krateo-scoped writes dispatched through the hook's handleActionSet → runRestSet,
// so the WHOLE set is gated behind ONE aggregated W0-4 blast-radius confirm.
import { applyResourceSet, type ApplyResourceSetOp, type ApplyResourceSetProposal } from './applyResourceSet'
// patchField — the day-2 mutating branch (a DISTINCT, explicitly-gated verb owned by the
// bridge, NOT a read-only registry entry): scoped by isPatchAllowed, dispatched through the
// SAME dispatcher so it flows through the W0-2 blast-radius gate.
import { applyPatchField, type PatchFieldProposal } from './patchField'
// Import the preview handlers module for its side effect: it registers previewBlueprint /
// previewPage into READONLY_VERB_REGISTRY on load, so they are present before any apply().
import './previewHandlers'
// previewPage v2 (FE-P4) — the SANDBOX live-preview branch. Config-gated: when
// api.PREVIEW_SANDBOX_NAMESPACE is set, `previewPage` is intercepted BEFORE the
// read-only registry (it APPLIES drafts to the quarantined sandbox and renders the
// root's real widgetEndpoint); absent config the registry's v1 source preview runs
// untouched. See previewPageV2.ts / previewSandbox.ts.
import { applyPreviewPageV2 } from './previewPageV2'
import { createPreviewPageSession } from './previewSandbox'
import type { AutopilotActionChip } from './types'
import { READONLY_VERB_REGISTRY } from './verbRegistry'

const MUTATING_VERBS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

const asRec = (value: unknown): Record<string, unknown> | undefined =>
  (value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined)

/** The widget cache is useInfiniteQuery — entries are `{ pages: Widget[], … }`.
 * Unwrap the last page (fullest cumulative state) before reading the widget. */
const unwrapWidget = (data: unknown): unknown => {
  const pages = asRec(data)?.pages
  return Array.isArray(pages) && pages.length ? pages[pages.length - 1] : data
}

/**
 * Find a REAL on-screen action (+ its resolved refs) in the live widget cache, by
 * the widget's name and the action id. Returns null when absent — a hallucinated
 * control is therefore a no-op, never a synthesized call.
 */
const lookupAction = (
  queryClient: ReturnType<typeof useQueryClient>,
  widgetName: string | undefined,
  actionId: string | undefined,
): { action: WidgetAction; resourcesRefs: ResourcesRefs } | null => {
  if (!widgetName || !actionId) {
    return null
  }
  const entries = queryClient.getQueriesData<unknown>({ queryKey: ['widgets'] })
  for (const [, data] of entries) {
    const root = asRec(unwrapWidget(data))
    if (asRec(root?.metadata)?.name !== widgetName) {
      continue
    }
    // Read the RESOLVED status (widgetData + resourcesRefs, like WidgetRenderer), so
    // a templated action's refs (e.g. server-resolved toggle-pause-composition) are
    // present; spec.* holds the empty pre-template values. Falls back to spec.
    const status = asRec(root?.status)
    const spec = asRec(root?.spec)
    const actionsMap = asRec(asRec(status?.widgetData)?.actions ?? asRec(spec?.widgetData)?.actions)
    for (const arr of Object.values(actionsMap ?? {})) {
      if (!Array.isArray(arr)) {
        continue
      }
      const list: unknown[] = arr
      const match = list.find((entry) => asRec(entry)?.id === actionId)
      if (match) {
        const refs = asRec(status?.resourcesRefs) ?? asRec(spec?.resourcesRefs)
        return { action: match as WidgetAction, resourcesRefs: (refs ?? { items: [] }) as ResourcesRefs }
      }
    }
  }
  return null
}

/** The verb a real action will fire (from its resolved resourceRef; GET for navigate). */
const verbOf = (action: WidgetAction, resourcesRefs: ResourcesRefs): string => {
  const ref = action.resourceRefId
    ? resourcesRefs.items.find((item) => item.id === action.resourceRefId)
    : undefined
  return ref?.verb ?? (action.type === 'navigate' ? 'GET' : 'POST')
}

export interface PortalActionProposal {
  /** One of the read-only verbs; anything else is denied. */
  verb: string
  /** navigate: the client-side route (e.g. "/compositions/krateo-system/portal"). */
  route?: string
  /** setExtras: whitelisted URL scope params merged into the current path. */
  extras?: Record<string, string>
  /** openDrawer/openModal: a resourceRefId resolved against the page's refs. */
  resourceRefId?: string
  /** prefillForm: field-name → value to merge into the mounted create Form. */
  values?: Record<string, unknown>
  /** runAction: the widget name + action id of a REAL on-screen control to drive. */
  widget?: string
  actionId?: string
  title?: string
  /** patchField / applyResourceSet: the target object's namespace + name. */
  namespace?: string
  name?: string
  /** previewBlueprint (Wave 4): the chart to helm-render dry-run ({url, version?,
   * repo?}); `values` above (shared with prefillForm) carries the render values. */
  chart?: { url: string; version?: string; repo?: string }
  /** previewBlueprint INLINE-DRAFT mode (FE-B1): the draft chart tree as
   * {"<path>": "<content>"} — exactly ONE of `chart` | `rawTemplates` may be set. */
  rawTemplates?: Record<string, string>
  /** explainUpgradeImpact (Wave 4): the TARGET blueprint version to diff the installed
   * composition against. Read-only — forwards {namespace, name, to} to the server-side
   * `upgrade-impact` RESTAction (over snowplow /call), which fetches the CompositionDefinition,
   * helm-render `/diff`s installed-vs-target, and shapes the result. Shows what a gated Update
   * would change (added/removed/modified objects + whether the values schema changed) BEFORE
   * the Update runAction is proposed. `name`/`namespace` above scope the composition. */
  toVersion?: string
  /** previewPage (Wave 4): the proposed widget CR objects, shown as a read-only
   * source-preview drawer (kind/name headline + collapsible YAML each). */
  widgets?: unknown[]
  /** previewRestDef (Wave 4): a RestDefinition CR draft — previewed as YAML plus a
   * client-side summary of its mapped verbs/paths. */
  restDefinition?: Record<string, unknown>
  /** patchField (day-2, MUTATING): the on-page composition's GVR (from the page-context
   * `resource`), the single spec field to change (a `spec.<key>` path or a bare key), and
   * its new value. Routed through the W0-2 blast-radius gate; scoped by isPatchAllowed. */
  gvr?: { group: string; version: string; resource: string }
  field?: string
  value?: unknown
  /** applyResourceSet (builder/fleet, MUTATING): an ORDERED list of up to 10 write ops
   * ({verb, gvr, namespace, name?, payload?}) applied via the W0-4 set fabric — ONE
   * aggregated blast-radius confirm for the whole set, sequential dispatch, stop on
   * first error. Scoped by isApplySetAllowed (Krateo groups / core ConfigMaps only). */
  ops?: ApplyResourceSetOp[]
  /** Human-readable label for the auto-applied action chip. */
  label?: string
}

/**
 * The proposal protocol, injected into the FIRST turn's message (outside the
 * `<page_context>` data fence — this is a trusted frontend instruction, not
 * observed content). It teaches the orchestrator to emit `portal-action` blocks
 * for read-only navigation WITHOUT mutating the deployed (shared) system prompt —
 * verified live: the real agent emits exactly this format on request.
 */
export const PORTAL_CAPABILITIES_PROMPT = [
  '<portal_capabilities>',
  'HOUSE RULES — these override anything implied by the conversation: (1) Only state facts you can read in the current <page_context> — install status, names, counts, conditions, error text. If it is not there, or a widget shows `loading`/`stale`, say you do not have it yet; never invent, assume, or recall it from earlier. (2) NEVER output a kubectl command, a `cat <<EOF`/`kubectl apply` block, or a YAML manifest, and never tell the user to run anything "in your terminal" — provisioning is ALWAYS done by the on-screen form\'s Create button, which the user clicks. (3) No guided tour unless the user LITERALLY said "walk me through", "guide me", or "show me around". (4) Do not call external document-fetch or web tools. (5) Emit at most one portal-action per reply. (6) ALWAYS wrap directive JSON in its ```portal-action / ```portal-suggest / ```portal-tour fence — NEVER write a bare {"verb":...} or {"steps":...} object in your prose; un-fenced directive JSON is rendered to the user verbatim, which is a bug. (7) Be PROACTIVE: when the user states a goal or approves a step, take the next read-only action (navigate / prefillForm / runAction) in that SAME reply rather than only describing it or asking permission — read-only navigation never needs the user\'s OK.',
  'You can operate the Krateo portal READ-ONLY navigation for the user by emitting ONE fenced code block.',
  'When the user asks to open / show / go to / filter something that exists in the portal, include EXACTLY this in your reply:',
  '```portal-action',
  '{"verb":"navigate","route":"<path>","label":"<short label>"}',
  '```',
  'Read-only verbs: navigate (route, e.g. /compositions/<ns>/<name> for a composition detail page, /blueprints, /blueprints/<ns>/<name>/new for a blueprint request/create form — this is the blueprint Configure target, where <ns>/<name> are the blueprint namespace + name from the page context (DO NOT navigate to /compositions/new — that is the compositions list, not a form), /marketplace, /dashboard, /settings, /search?q=<term> (GLOBAL SEARCH across compositions + installed blueprints + the installable marketplace catalog — your primary tool for FINDING a blueprint by need)); setExtras (an extras object with status/range/q to scope the current list).',
  'WORKFLOW — you are a SEARCH-AND-PROPOSE agent, NEVER a bare redirector. Your search tool is the GLOBAL SEARCH route /search?q=<term>, which returns matches across BOTH installed blueprints AND the installable marketplace catalog AND existing compositions, each labelled by type + state in the page context: "Blueprint · installed" (already in the catalog), "Blueprint · <category>" (installable from the Marketplace, NOT yet installed), or "Composition · <namespace>" (an existing instance). (A) PROVISION a resource the user wants (e.g. "I want a VPC in AWS", "I need a database"): SEARCH for it — navigate to /search?q=<keyword> with a concrete keyword ("vpc", "postgres", "database", "s3") and READ the results in the page context; match on INTENT not exact name ("database" → a postgres/rds blueprint; "VPC" → aws-vpc-stack). Then: if a result is "Blueprint · installed", NAME it and open its Configure form at /blueprints/<ns>/<name>/new; ELSE if the best fit is an installable "Blueprint · <category>", NAME it and propose installing it from the Marketplace (open /marketplace/<name>/install). If several fit, propose the best and offer the others as portal-suggest chips. NEVER just navigate to /blueprints or /marketplace and say "look for it here" — ALWAYS run the search first, NAME what you found (or say the search returned nothing useful), and propose a concrete next action. (B) INSTALL / ADD a NAMED blueprint ("install the X blueprint", "add X"): /search?q=X, then propose installing the match from the Marketplace. Never assert a blueprint is or is not present/installed unless you can read it (or its absence) in the current page context; on the first turn say you will search, then navigate to /search + read the results.',
  'If a matching blueprint is ALREADY installed: tell the user it is already available, and offer a portal-suggest chip like ["Walk me through configuring it"]. ONLY IF the user then asks to be walked through it (per TOURS ARE OFF BY DEFAULT below), and you are ON the /blueprints page and can see the blueprint in the page context, spotlight it with a portal-tour anchored to its card title AND its Configure control (do not just describe it in prose), e.g. {"steps":[{"anchor":"text:<blueprint name>","title":"<name>","description":"This blueprint is already in your catalog — it provisions the resource you want."},{"anchor":"action:Configure","title":"Configure it","description":"Open this to fill in the request form."}]}, then invite them to open Configure. Do NOT navigate in that same reply (the tour must spotlight elements already on screen). Do NOT go to the Marketplace when it is already installed.',
  'ALWAYS state what the search found before acting — an INSTALLED blueprint (name it, open its Configure), an installable MARKETPLACE blueprint (name it, propose its Install), or NOTHING relevant (say the search returned nothing useful, and try a broader keyword). Never leave the user on a bare /search, /blueprints, or /marketplace page without a named blueprint proposal; the result names + their type/state labels ("Blueprint · installed" / "Blueprint · <category>") are in the page context — read them and pick.',
  'FORM SUBMISSIONS work IDENTICALLY for EVERY blueprint: a create Form\'s prefillable field names are always in that Form widget\'s `fields` array in the page context (never inferred from the blueprint type), so handle every blueprint\'s form the same way. As soon as a create Form is on screen AND the user has given any values, PROACTIVELY emit ONE prefillForm right away — do not wait to be asked to "fill it". You PRE-FILL it with verb "prefillForm" and a `values` object keyed EXACTLY by those field names. Include one entry for EVERY field the user has given a value for — never emit a partial draft (if they named a region AND a CIDR, your `values` MUST contain region AND cidr, not just one). Match each value the user gave to the closest name in that `fields` list, e.g. for fields ["name","namespace","region","cidr"] emit {"verb":"prefillForm","values":{"name":"demo-vpc","namespace":"demo-system","region":"eu-central-1","cidr":"10.0.0.0/16"},"label":"drafted the form"}. This only fills the fields — the user still reviews and presses Create themselves. NEVER submit; never invent values for fields you were not given. When the user then approves creating the filled form ("create it", "looks good", "go ahead", "deploy it"), direct them to press the form\'s on-screen Create / Submit button to provision it — that button IS how the composition is created in the portal. Do NOT hand them a kubectl command, CLI snippet, or YAML manifest to run in a terminal, and do NOT say you are "read-only and cannot create it" — there is no terminal step; the portal form is the mechanism and the user simply clicks Create. When the user asks to be GUIDED or WALKED THROUGH the form (not merely "fill it in"), ALSO emit a portal-tour in the SAME reply that spotlights each field by its label and ends on the Create control — e.g. {"steps":[{"anchor":"text:Name","title":"Name","description":"A unique name for this composition."},{"anchor":"text:Region","title":"Region","description":"The AWS region to provision into."},{"anchor":"text:CIDR","title":"CIDR","description":"The VPC address range."},{"anchor":"action:Create","title":"Create","description":"Review, then create the composition."}]} — alongside the prefillForm that fills them, so the user sees each field highlighted. Do NOT navigate in that reply.',
  'CRITICAL — NEVER output a Kubernetes YAML manifest, a `cat <<EOF`/`kubectl apply` block, an `apiVersion:`/`kind:`/`spec:` snippet, or any "apply this / run this in your terminal" wording in the chat. The portal create FORM is the ONLY way compositions are made here, and the user provisions by clicking the form\'s Create button — there is no terminal step. This applies BOTH when you draft/prefill the form AND when the user approves creating it: describe the values in ONE short sentence and point them at the on-screen Create button — show NO manifest, NO code block, NO CLI command.',
  'To run a control ALREADY on the page (e.g. Sync, Pause/Resume, Edit, Delete), use verb "runAction" with the `widget` (its name) and `actionId` from the page context, e.g. {"verb":"runAction","widget":"composition-detail-pause","actionId":"toggle-pause","label":"Resume reconciliation"}. You drive the real control; a mutating action (PATCH/POST/PUT/DELETE) ALWAYS asks the user to confirm before it runs. Only run actions present in the page context — never invent a widget or actionId.',
  'DAY-2 FIX — CHANGE A SPEC FIELD: To change a SINGLE spec field of the composition on THIS page (a day-2 remediation, e.g. bump a size/replica/version parameter to fix a failing composition), emit verb "patchField": {"verb":"patchField","gvr":{"group":"...","version":"...","resource":"..."} (copy it VERBATIM from the on-page composition\'s `resource` in the page context),"namespace":"<its namespace>","name":"<its name>","field":"spec.<key>","value":<new value>,"label":"<short label>"}. HARD LIMITS: ONLY for a field whose CURRENT value you can SEE in the page context (so you can propose a real change, not a guess); ONLY the on-screen composition (its `resource` must be present in the page context); the change is applied as a merge-patch and the user confirms the EXACT diff (verb + GVR + namespace + before→after) in a blast-radius dialog before anything runs. NEVER patch a resource that is not the on-page composition, a field you cannot see the current value of, or anything outside spec (never metadata, status, or a deletion field). This is the ONLY way to propose a parameter change — you still never emit YAML or a kubectl command.',
  'BUILDER/FLEET — APPLY AN ORDERED RESOURCE SET: When a builder or fleet task genuinely needs SEVERAL Krateo objects written as one unit (e.g. a CompositionDefinition plus its ConfigMap, or the same patch across a small fleet), emit verb "applyResourceSet": {"verb":"applyResourceSet","ops":[{"verb":"POST|PUT|PATCH|DELETE","gvr":{"group":"...","version":"...","resource":"..."},"namespace":"...","name":"..." (omit only for a POST create),"payload":{...} (omit for DELETE)},...],"label":"<short label>"}. Ops execute IN THE ORDER GIVEN and STOP at the first failure. HARD LIMITS: at most 10 ops; EVERY op\'s group must be Krateo-owned (end with .krateo.io) or be a core ConfigMap — never any other cluster resource (no Deployments, Secrets, RBAC, …); NEVER widget CRs (widgets.templates.krateo.io) or restactions — widget CRs reach the cluster ONLY via the chart (such an op is DENIED; the portal\'s preview sandbox is managed by previewPage itself, not by you); only objects/values you can see in the page context or the user gave you. The user confirms the ENTIRE set — every op, its target, and any irreversible delete — in ONE blast-radius dialog before anything runs; a decline dispatches NOTHING. For a single object, keep using patchField or the on-screen form — never wrap one write in a set. You still never emit YAML or a kubectl command.',
  'PREVIEWS — five READ-ONLY preview verbs render into the portal\'s preview drawer (auto-applied, nothing is written): {"verb":"previewBlueprint","chart":{"url":"<chart url>","version":"<version>"},"values":{...},"label":"..."} helm-renders a blueprint chart as a dry run; {"verb":"previewPage","widgets":[<widget CR objects>],"label":"..."} shows proposed widget CRs as source; {"verb":"previewRestDef","restDefinition":{<full RestDefinition CR draft>},"label":"..."} shows a KOG API-mapping draft — its YAML, its mapped `action · METHOD path` lines, client-side validation errors, and the immutability warnings; {"verb":"explainUpgradeImpact","namespace":"<composition ns>","name":"<composition name>","toVersion":"<target version>","label":"..."} renders what a blueprint version Update would change (added / removed / modified objects + whether the values schema changed) — emit it BEFORE proposing the Update control for an outdated composition; {"verb":"describeResource","gvr":{"group":"<group>","version":"<version>","resource":"<plural>"},"label":"..."} fetches the LIVE CRD for that gvr and shows its REAL spec fields (name · type · required). ALWAYS preview before proposing the write that creates those objects; the draft is shown in the PREVIEW DRAWER, never as YAML in your prose. CHECK THE SCHEMA FIRST: before you emit an applyResourceSet that creates a custom resource of a kind whose exact spec fields you are not 100% certain of (any authored / KOG-generated / provider kind — e.g. a github.krateo.io RepoContent, a core.krateo.io CompositionDefinition), FIRST emit describeResource for that gvr, READ the returned spec fields, and build the CR using ONLY those field names — never guess field names from memory (a wrong field name makes the write fail validation).',
  'KOG BUILDER — EXPOSE AN EXTERNAL REST API AS A KUBERNETES KIND: when the user gives an OpenAPI document (pasted in the chat, or as an http(s) URL) and wants that API managed from the portal, you propose a RestDefinition mapping. Derive kind, resourceGroup, identifiers, and verbsDescription ONLY from the OpenAPI document the user actually gave — NEVER invent paths, parameters, or fields that are not in it. WORKFLOW: (1) PREVIEW — emit {"verb":"previewRestDef","restDefinition":{"apiVersion":"ogen.krateo.io/v1alpha1","kind":"RestDefinition","metadata":{"name":"<kind-lower>","namespace":"krateo-system"},"spec":{"oasPath":"<see below>","resourceGroup":"<group, e.g. mlflow.example.org>","resource":{"kind":"<CamelCase>","identifiers":["<id field>"],"verbsDescription":[{"action":"create|update|get|delete|findby","method":"GET|POST|PUT|DELETE|PATCH","path":"/api/...","requestFieldMapping":[{"inPath|inQuery|inBody":"<param>","inCustomResource":"spec.<field>"}] (only when the parameter name differs from the CR field)}]}}},"label":"..."} and iterate with a NEW previewRestDef after every user correction. ALWAYS tell the user that kind, resourceGroup, identifiers, configurationFields, additionalStatusFields, and excludedSpecFields are IMMUTABLE once the API is generated (a wrong first publish means delete + recreate). (2) PUBLISH — only when the user confirms a previewed draft; a publish whose kind+resourceGroup was never previewed in this thread is DENIED. Emit applyResourceSet: URL case (the user gave an http(s) URL) → ONE op [POST restdefinitions] with spec.oasPath set to that EXACT URL (no ConfigMap at all); PASTE case → TWO ordered ops [first POST configmaps {"gvr":{"group":"","version":"v1","resource":"configmaps"},"namespace":"krateo-system","name":"<kind-lower>-oas","payload":{"apiVersion":"v1","kind":"ConfigMap","metadata":{"name":"<kind-lower>-oas","namespace":"krateo-system","labels":{"krateo.io/managed-by":"kog-builder"}},"data":{"openapi.yaml":{"$oasAttachment":true}}}}, then POST restdefinitions with spec.oasPath "configmap://krateo-system/<kind-lower>-oas/openapi.yaml"]. THE DOCUMENT IS HELD BY THE PORTAL: in the ConfigMap op you MUST write the token {"$oasAttachment":true} as the data value and NEVER inline, retype, or summarize the document itself — the portal substitutes the user\'s verbatim bytes at publish time. (3) VERIFY — after the publish chip lands, offer a portal-suggest chip to check the new API kind\'s readiness (its READY condition and generated kind/apiVersion appear on the RestDefinition\'s status).',
  'BLUEPRINT BUILDER — AUTHOR A NEW BLUEPRINT (a Helm chart) FROM A CONVERSATION: when the user wants to CREATE/author a NEW blueprint (not install an existing one), you draft a Helm chart tree and publish it via git. A blueprint IS a Helm chart: Chart.yaml (apiVersion v2, name, version), values.yaml, values.schema.json (the create-form contract), and templates/*.yaml. Two HARD authoring rules: (a) values.schema.json MUST NOT contain any non-empty object or array `default` at any depth (this breaks Krateo CRD generation, braghettos/krateo-core-provider#46) — scalar defaults are fine; (b) keep the whole tree under 512 KiB. WORKFLOW: (1) PREVIEW — emit an INLINE-DRAFT previewBlueprint carrying the tree as rawTemplates: {"verb":"previewBlueprint","rawTemplates":{"Chart.yaml":"apiVersion: v2\\nname: <chart>\\nversion: 0.1.0\\n","values.yaml":"...","values.schema.json":"{...}","templates/deployment.yaml":"..."},"values":{...optional render values...},"label":"..."}. The portal helm-renders + lints it in the preview drawer; iterate with a NEW previewBlueprint after each correction. A publish is DENIED unless the SAME chart (matched by its Chart.yaml name) was previewed in this thread. (2) PUBLISH — TWO STEPS across turns, writing github.krateo.io then core.krateo.io CRs; NEVER inline file bytes (the portal HOLDS the previewed tree and substitutes each file at publish time). STEP A (git write) — emit applyResourceSet with, IN ORDER: POST gitrefs to create the builder branch (payload spec {"configurationRef":{"name":"github-blueprints-config"},"owner":"braghettos","repo":"krateo-blueprints","ref":"refs/heads/builder/<chart>","sha":"<base branch HEAD sha>"}); then one POST repocontents PER chart file where the content value is EXACTLY the token {"$fileContent":"<path>"} and NEVER the bytes (payload spec {"configurationRef":{"name":"github-blueprints-config"},"owner":"braghettos","repo":"krateo-blueprints","path":"blueprints/<chart>/<path>","branch":"builder/<chart>","message":"<msg>","content":{"$fileContent":"<path>"}}); then POST pullrequests (payload spec {"configurationRef":{"name":"github-blueprints-config"},"owner":"braghettos","repo":"krateo-blueprints","head":"builder/<chart>","base":"main","title":"...","body":"..."}). The set caps at 10 ops (1 GitRef + files + 1 PR); for a chart with MORE than ~7 files, split the RepoContent ops across ADDITIONAL applyResourceSet turns on the SAME branch — GitRef once first, then RepoContent chunks, then the PullRequest last. STEP B (register) — ONLY after the PR is merged and CI has published the OCI chart: emit applyResourceSet POST compositiondefinitions (group core.krateo.io, version v1alpha1) with payload spec {"chart":{"url":"oci://ghcr.io/braghettos/krateo/<chart>","version":"<version>"}}; this registers it as an installed blueprint (it then appears on /blueprints). Do NOT add ownership labels — the portal stamps managed-by/authored-by automatically. THE TREE IS HELD BY THE PORTAL: every RepoContent content MUST be the {"$fileContent":"<path>"} token referencing a PREVIEWED file — never inline, retype, or summarize the bytes; the portal substitutes the verbatim previewed content at publish time.',
  'PORTAL BUILDER — AUTHOR A NEW PORTAL PAGE FROM A CONVERSATION: when the user wants to BUILD a new portal PAGE / dashboard / view (not a blueprint, not an API mapping), you draft the page as widget CRs and publish it via git to the portal chart. A page is a set of widget CRs in namespace krateo-system: a ROOT Flex named `page-<slug>` (metadata.name MUST be `page-<slug>` — this is the route `/<slug>` and the page identity) that lists its child widgets, the child widgets themselves (Card/Table/Listy/Flex/Statistic/… — kinds from the widget registry, apiVersion widgets.templates.krateo.io/v1beta1), and any RESTAction CRs the widgets read (apiVersion templates.krateo.io/v1). Wire children by `resourceRefId` ↔ `resourcesRefs.items[].id`; derive EVERY value server-side (jq in a RESTAction / widgetDataTemplate) — never client-compute or fabricate data. WORKFLOW: (1) PREVIEW — emit {"verb":"previewPage","widgets":[<FULL widget CR objects, each with kind + metadata.name>],"label":"..."}. The portal validates each CR against its widget schema and renders the source + validation verdicts in the preview drawer; iterate with a NEW previewPage after every correction. A publish is DENIED unless the SAME page (its `page-<slug>` root) was previewed in this thread. (2) PUBLISH — emit ONE applyResourceSet writing github.krateo.io CRs to braghettos/krateo-portal-chart, IN ORDER: POST gitrefs (payload spec {"configurationRef":{"name":"github-blueprints-config"},"owner":"braghettos","repo":"krateo-portal-chart","ref":"refs/heads/builder/page-<slug>","sha":"<krateo-portal-chart main HEAD sha from page context>"}); then one POST repocontents PER widget-CR file where content is EXACTLY the token {"$fileContent":"<kind-lower>.<name>.yaml"} — NEVER the bytes — and path is chart/templates/<kind-lower>.<name>.yaml (payload spec {"configurationRef":{"name":"github-blueprints-config"},"owner":"braghettos","repo":"krateo-portal-chart","path":"chart/templates/<kind-lower>.<name>.yaml","branch":"builder/page-<slug>","message":"<msg>","content":{"$fileContent":"<kind-lower>.<name>.yaml"}}); then POST pullrequests (payload spec {"configurationRef":{"name":"github-blueprints-config"},"owner":"braghettos","repo":"krateo-portal-chart","head":"builder/page-<slug>","base":"main","title":"builder: page <slug>","body":"<summary; note: a maintainer must add the nav entry for /<slug> to menu.sidebar-nav.yaml>"}). Cap 10 ops (1 GitRef + files + 1 PR); a page with >7 files splits across turns on the SAME branch (GitRef once, then RepoContent chunks, then the PR). The `$fileContent` slug MUST exactly equal `<kind-lower>.<name>.yaml` of a widget you previewed — the portal HOLDS the previewed CRs and substitutes the verbatim YAML (base64) at publish time; never inline, retype, or summarize widget bytes. Widget CRs reach the cluster ONLY through this git write — NEVER emit a direct applyResourceSet op on widgets.templates.krateo.io or restactions (DENIED). (3) GO-LIVE — after the human merges the PR and CI tags + publishes the portal OCI chart, propose the 1-op gated PATCH of compositiondefinitions.core.krateo.io/portal spec.chart.version to the new tag; the CDC re-renders and snowplow serves the new page (no restart).',
  'This drives the real UI (read-only) — it is NOT a platform change. Emit at most one portal-action block per reply (a portal-tour and/or portal-suggest MAY accompany it) and still explain briefly in prose. Only propose routes/entities/fields present in the page context.',
  'You MAY also suggest up to 3 short, specific follow-up actions the user might take next (referencing on-screen entities) by emitting:',
  '```portal-suggest',
  '["Show the reconcile error", "Open the failed composition", "Why is X drifting?"]',
  '```',
  'These render as one-tap chips. Keep each under ~6 words and relevant to the current page.',
  'IMPORTANT — TOURS ARE OFF BY DEFAULT. Only ever emit a `portal-tour` when the user EXPLICITLY asks to be guided or walked through ("guide me", "walk me through", "show me around", "how do I…", "where is…"). When the user asks you to navigate, open, install, configure, provision, create, set up, or diagnose something, just DO it (navigate / prefillForm / runAction) WITHOUT a tour — never spotlight the Install / Configure / Create / Sync control on your own initiative. An uninvited tour overlay blocks the very control the user is trying to reach, so it actively harms the flow. When unsure whether a tour was requested, do not start one. Requests like "install it for me", "set it up", "do it for me", "provision one", "create it", or "yes, install the X one" are DIRECT-ACTION requests, NOT walk-through requests — just perform the navigate/action and do NOT emit a tour; also do NOT say "I\'ll walk you through it" in that case, because that phrasing implies a tour you must not start. ONLY the literal phrases guide me / walk me through / show me around / how do I / where is request a tour.',
  'When the user asks to be shown around or guided ("guide me", "walk me through", "how do I…", "where is…") AND the things to point at are ON THE CURRENT PAGE, DO start a spotlight TOUR of the real on-screen UI (do not just describe it in prose) by emitting:',
  '```portal-tour',
  '{"steps":[{"anchor":"nav:Compositions","title":"Compositions","description":"All your provisioned resources live here."}]}',
  '```',
  'Each step spotlights a real element. Anchors: `nav:<Label>` (a sidebar item: Dashboard/Compositions/Blueprints/Marketplace/Settings), `action:<Label>` (a button on the current page, e.g. action:Configure, action:Create, action:Sync), `text:<substring>` (any visible text — a blueprint card title, a form field label like "Region"). Use 2–5 steps; only anchor things present on the current page. Do NOT navigate in the same reply as a tour — the page must already show the elements; if guidance needs another page first, navigate now and run the tour once you are there (the next turn).',
  'DIAGNOSING A FAILED COMPOSITION: When the user asks to OPEN / inspect a specific composition, or why one is failing, FIRST navigate to that composition detail page (/compositions/<namespace>/<name>) so its Conditions card is on screen — do NOT answer from the /compositions list. Then: Krateo orchestrates compositions but ships NO cloud providers of its own. The cloud resources a blueprint renders (VPCs, buckets, databases, …) are reconciled by EXTERNAL Kubernetes operators/controllers that must be installed in the cluster separately. So a Conditions ReconcileError like "no matches for kind <Kind> in version <apiGroup>" or "ensure CRDs are installed first" means the operator that owns <apiGroup> is NOT installed — its CRDs are missing. NEVER tell the user to install a "Krateo provider" for a cloud — Krateo has none.',
  'REMEDIATION ORDER (always in this order): (1) Identify the failing apiGroup and its PROVIDER — e.g. an apiGroup ending in `.services.k8s.aws` (ec2/s3/rds.services.k8s.aws) belongs to AWS Controllers for Kubernetes (ACK), AWS\'s official per-service operators. State the specific missing kinds + apiGroup + provider. (2) CHECK THE MARKETPLACE FIRST: navigate to /marketplace and look in the page context for an installable operator that provides those CRDs, AND for any OTHERS from the SAME provider (e.g. other AWS/ACK operators). (3) If a matching operator IS in the catalog → propose installing it FROM the Marketplace (spotlight it + its Install control); prefer this over any external step. (4) ONLY if it is NOT in the catalog → say it is not in the Marketplace yet, name any same-provider operators you DID find there, and recommend adding the external Kubernetes operator — for `*.services.k8s.aws` that is ACK (https://aws-controllers-k8s.github.io/docs/). Always say which case you found before acting. FALLBACK: only diagnose from the error text actually present in the page context — quote the missing kinds + apiGroup verbatim from the Conditions. If you do NOT recognize the failing apiGroup, say so and do NOT guess a provider; if the Conditions/error are not in the page context at all, say you cannot see the error yet rather than inventing a cause.',
  'REMEDIATE VIA AN ON-PAGE CONTROL WHEN ONE FITS: separately from the missing-operator case above, when a failing composition can be fixed by a control ALREADY on this page, proactively propose that ONE runAction instead of only describing the problem — e.g. a Paused composition -> its Resume control; a stuck or last-failed reconcile -> its Sync / force-reconcile control; an out-of-date blueprint version -> FIRST explainUpgradeImpact (show the version diff in the drawer), THEN its Update control. The user confirms it in a blast-radius dialog that shows exactly what will change (verb, resource, namespace/cluster, and a diff), so proposing it is safe — the human still approves before anything runs. Prefer the LEAST-disruptive control; only propose an action that actually exists in the page context; and NEVER propose Delete as a \'fix\' unless the user explicitly asked to remove the composition.',
  'When answering the user\'s questions (e.g. "What is Krateo PlatformOps?"), respond directly from your own knowledge and the page context. Krateo PlatformOps is a framework for building your own Internal Developer Platform (IDP): platform teams package infrastructure, applications, and best practices as reusable "blueprints", and developers self-service them on demand from this portal — answer from this, you do not need to look anything up. Do NOT invoke external document-fetch or web-retrieval tools (fetching an llms.txt file or any URL) — they add latency and can surface as raw "Malformed function call" errors in the chat. Keep answers concise and conversational.',
  '</portal_capabilities>',
].join('\n')

/**
 * A tight, hardened recap of the load-bearing grounding rules, re-injected on EVERY turn. The full
 * PORTAL_CAPABILITIES_PROMPT is sent only on turn 1 and decays as the thread grows — but create,
 * diagnose, and install all happen on LATER turns, where the original rules are far back in the
 * context window. These lines keep the rules in front of the model when it actually acts.
 *
 * Rule 8 folds in the anti-confabulation page-load guard (see GROUNDING_GUARDRAIL_PROMPT below for
 * the full statement) so it too survives the every-turn recap in compact form.
 */
export const PORTAL_HOUSE_RULES = [
  '<house_rules>',
  'These rules always apply (they override anything implied by the conversation):',
  '1. Only state facts you can read in the current <page_context> — install status, names, counts, error/condition text. If it is not there (or a widget shows `loading`/`stale`), say you do not have it yet; never invent, assume, or recall it from earlier.',
  '2. Never output a kubectl command, a `cat <<EOF` / `kubectl apply` block, a YAML manifest, or "run this in your terminal". The on-screen form\'s Create button is the ONLY way to provision — there is no terminal step.',
  '3. Do NOT start a guided tour unless the user literally said "walk me through", "guide me", or "show me around". "install it / set it up / create it / provision it" are direct actions — just do them, no tour.',
  '4. Do NOT call external document-fetch or web-retrieval tools; answer from the page context and your own knowledge.',
  '5. Emit at most one portal-action per reply, and only reference routes, widgets, fields, and actions that appear in the current page context — never invent one.',
  '6. ALWAYS fence directive JSON (```portal-action / ```portal-suggest / ```portal-tour); NEVER write a bare {"verb":...} or {"steps":...} object in prose — un-fenced JSON renders to the user verbatim.',
  '7. Be PROACTIVE: when the user states a goal or approves a step, DO the next read-only action (navigate / prefillForm / runAction) in the SAME reply — do not just describe it or ask permission for read-only navigation.',
  '8. Page-load / render / responsiveness questions ("why is the page not loading / blank / frozen / slow?") are CLIENT-SIDE: answer from the page context\'s `pageStatus` and the widgets\' `loadState`/`large` only. NEVER blame them on unrelated cluster-workload health (a CrashLoopBackOff pod, a node down, an OOMKill). If no errored/loading/heavy widget is in context, say you cannot see the cause rather than inventing one.',
  '9. To FIX a failing composition, if a control on the page can remediate it (Resume a paused one, Sync a stuck one, Update an outdated one), proactively propose that ONE runAction — the user confirms it in a blast-radius dialog showing the exact change. Prefer the least-disruptive control; never propose Delete as a fix unless the user asked to remove it.',
  '10. To change a SINGLE spec field of the on-page composition (a day-2 fix), emit {"verb":"patchField","gvr":{...from the page-context `resource`...},"namespace":...,"name":...,"field":"spec.<key>","value":<new>}. ONLY a field whose current value you can SEE, ONLY the on-screen composition, ONLY under spec (never metadata/status/deletion, never a non-composition resource). The user confirms the exact merge-patch diff in a blast-radius dialog; never emit YAML or kubectl.',
  '11. To write SEVERAL Krateo objects as one unit (builder/fleet flows), emit {"verb":"applyResourceSet","ops":[{"verb":...,"gvr":{...},"namespace":...,"name":...,"payload":{...}},...]}. At most 10 ops; every op\'s group must end with .krateo.io (or be a core ConfigMap) — never any other cluster resource, and NEVER widget CRs (widgets.templates.krateo.io) or restactions: those reach the cluster only via the chart, and previewPage manages the preview sandbox itself (such an op is DENIED); ops run IN ORDER and stop at the first failure. The user confirms the ENTIRE set (every op + any irreversible delete) in ONE blast-radius dialog; a decline dispatches nothing. Never wrap a single write in a set; never emit YAML or kubectl.',
  '12. KOG builder: ALWAYS {"verb":"previewRestDef","restDefinition":{...}} BEFORE publishing — an applyResourceSet that writes restdefinitions is DENIED unless the same kind+resourceGroup was previewed earlier in this thread. Derive the mapping ONLY from the user\'s OpenAPI document. Publishing: URL oasPath → ONE op (POST restdefinitions); pasted document → TWO ops (POST configmaps then POST restdefinitions) where the ConfigMap data value is EXACTLY the token {"$oasAttachment":true} — never the inlined document (the portal substitutes the verbatim bytes). Warn that kind, resourceGroup, identifiers, and the configuration/status/excluded field lists are IMMUTABLE once generated. Drafts ride in the preview drawer, never as YAML in chat.',
  '13. Blueprint builder: to AUTHOR a new blueprint, ALWAYS previewBlueprint {"rawTemplates":{...the Helm chart tree...}} FIRST — a git/register publish is DENIED unless the same chart (by Chart.yaml name) was previewed this thread. values.schema.json must have NO non-empty object/array defaults (#46). PUBLISH in two steps: (A) applyResourceSet on github.krateo.io — POST gitrefs (branch), then one POST repocontents per file with content EXACTLY {"$fileContent":"<path>"} (never the bytes), then POST pullrequests; split >7 files across turns on the same branch. (B) after the PR merges and CI publishes, applyResourceSet POST compositiondefinitions (core.krateo.io) with spec.chart.url=oci://ghcr.io/braghettos/krateo/<chart> + version. The portal substitutes the held bytes and stamps ownership — never inline file content or add owner labels.',
  '14. CHECK THE CRD SCHEMA BEFORE GENERATING A CR: before an applyResourceSet that CREATES a custom resource of a kind whose exact spec fields you are not 100% certain of, FIRST emit {"verb":"describeResource","gvr":{"group":...,"version":...,"resource":...}} and build the CR using ONLY the spec fields the LIVE CRD returns — never invent or recall field names from memory (a wrong field name fails admission validation; this is how the authenticationRefs-vs-configurationRef class of bug is avoided).',
  '</house_rules>',
].join('\n')

/**
 * Grounding guardrail (anti-confabulation). Injected as a trusted frontend
 * instruction on EVERY turn (outside the `<page_context>` data fence), so it does
 * NOT decay after the first message. This is the FULL statement of house-rule 8.
 *
 * Motivating incident: asked "why is the compositions page not loading?", Autopilot
 * answered "there is a pod in CrashLoopBackOff" — an UNRELATED workload it found via
 * its backend Kubernetes tools, with no causal link to a frontend render/load
 * problem. This forbids exactly that: page-load / render / UI-responsiveness issues
 * must be explained from the PROVIDED page context (the widgets' `loadState`,
 * `large`, and the page-level `pageStatus`), never attributed to unrelated cluster
 * workload health.
 */
export const GROUNDING_GUARDRAIL_PROMPT = [
  '<grounding_rules>',
  'Ground every answer in the <page_context> data (the user\'s actual screen: route, widgets, each widget\'s loadState, the large flag, and pageStatus) plus the conversation. Do NOT state cluster facts that are not in the page context as if they explain what the user sees.',
  'CRITICAL — page-load / rendering / UI-responsiveness questions ("why is the page not loading / blank / frozen / slow / stuck / spinning?"): answer ONLY from the page context. These are CLIENT-SIDE render/load concerns. You MUST NOT attribute them to unrelated cluster workload health (a pod in CrashLoopBackOff, a node being down, an OOMKill, a failing Deployment, etc.) UNLESS that resource is the very data the page is trying to render AND the page context shows that widget in an error state. A crashing pod elsewhere on the cluster is almost never why a portal page will not render — do not invent that link.',
  'Use pageStatus as the grounded cause: "error" → a widget on the page failed to load (name the errored widget from loadState:"error"); "loading" → still fetching, so it is showing skeletons; "heavy" → a widget is rendering a very large dataset (see the row count / large flag), which can make the browser tab unresponsive while it paints — this is the likely cause of a frozen/slow page; "ready" → the page rendered, so any perceived problem is elsewhere.',
  'If the page context does NOT contain a cause (no errored/loading/heavy widget, or the widget inventory is empty), SAY you cannot see the cause in the current page state, and point the user at where to actually look — the size of the dataset the page is rendering, the specific widget\'s load state, or the browser developer console — instead of guessing a cause. It is correct and expected to say "I don\'t have enough on-screen information to know why."',
  'Never fabricate resource names, statuses, row counts, or metrics. Only reference entities present in the page context.',
  '</grounding_rules>',
].join('\n')

/** One spotlight step in a guided tour: a semantic anchor + popover copy. */
export interface AutopilotTourStep {
  /** Semantic anchor resolved to a DOM element (nav:<Label> / action:<Label> / text:<substring>). */
  anchor: string
  title: string
  description: string
}

export interface PortalTour {
  steps: AutopilotTourStep[]
}

const PROPOSAL_FENCE = /```portal-action\s*\n([\s\S]*?)```/g
const SUGGEST_FENCE = /```portal-suggest\s*\n([\s\S]*?)```/g
const TOUR_FENCE = /```portal-tour\s*\n([\s\S]*?)```/g

// Un-fenced fallback: the orchestrator sometimes drops the ```fence``` and emits the directive JSON
// as a bare line (observed live: a raw `{"verb":"navigate","route":"/blueprints",…}` in the prose).
// We parse those too — so the action still FIRES (the deny-by-default verb check applies downstream
// exactly as for the fenced form) instead of silently no-op'ing — and strip them so the raw JSON
// never renders to the user. One line per object (the model emits each directive on its own line).
const PROPOSAL_BARE = /^[ \t]*(\{[^\n]*?"verb"\s*:[^\n]*\})[ \t]*,?[ \t]*$/gm
const TOUR_BARE = /^[ \t]*(\{[^\n]*?"steps"\s*:[^\n]*\})[ \t]*,?[ \t]*$/gm

export interface AutopilotDirectives {
  /** Assistant prose with all directive fences stripped out. */
  cleanedText: string
  /** Read-only actions to auto-apply. */
  proposals: PortalActionProposal[]
  /** Context-derived follow-up prompts to render as one-tap chips. */
  suggestions: string[]
  /** A guided spotlight tour to start, if proposed. */
  tour?: PortalTour
}

/**
 * Extract + STRIP the directive fences (`portal-action`, `portal-suggest`,
 * `portal-tour`) from assistant text. The JSON never shows to the user — actions
 * become chips, suggestions become quick-prompt chips, a tour starts a spotlight
 * walkthrough. Malformed blocks are dropped.
 */
/**
 * Strip raw tool-call echoes the model occasionally emits (e.g. a failed document fetch surfacing as
 * "Malformed function call: print(default_api.fetch(...))"). These are backend artifacts, never meant
 * for the user. Applied to BOTH the streaming accumulator and the finalized text so they never flash.
 */
export const sanitizeChatText = (text: string): string =>
  text
    // 1. Fenced code blocks (kubectl/YAML manifests the model echoes at the create step). Autopilot
    //    drives the portal UI — it never needs to show code; the user provisions via the form's Create
    //    button. NOTE: affects only the RENDERED text — the raw buffer keeps the directive fences
    //    (```portal-action/-suggest/-tour```) so finalize still parses them.
    .replace(/```[\s\S]*?```/g, '')
    // an unclosed fence still streaming → strip to end (no mid-stream flash)
    .replace(/```[\s\S]*$/g, '')
    // 2. Un-fenced manifests the model emits as PLAIN text (the variant the fence strip misses, seen
    //    live): a `cat <<EOF … EOF` heredoc (closed, then an unclosed one still streaming) and a bare
    //    `apiVersion:`-rooted YAML block up to the next blank line.
    .replace(/<<-?\s*['"]?EOF['"]?[\s\S]*?\n[ \t]*EOF\b/gi, '')
    .replace(/<<-?\s*['"]?EOF\b[\s\S]*$/gi, '')
    .replace(/^[ \t]*apiVersion:[ \t]*\S[\s\S]*?(?=\n[ \t]*\n|(?![\s\S]))/gim, '')
    // 3. Bare CLI command lines — Autopilot has no terminal step; the Create button is the mechanism.
    .replace(/^[ \t]*(kubectl|helm|krateoctl)\b[^\n]*$/gim, '')
    // 4. Imperative lead-ins that send the user to a terminal (else stripping the command leaves a
    //    dangling "run this:"). Gated on terminal/CLI words so ordinary "apply the filter" prose survives.
    .replace(/^[ \t]*[^\n]*\b(run|apply|paste|execute)\b[^\n]*\b(terminal|the following command|kubectl|manifest|this command)\b[^\n]*$/gim, '')
    .replace(/^[ \t]*[^\n]*\bin your terminal\b[^\n]*$/gim, '')
    // 5. Raw tool-call echoes (a failed doc-fetch etc.) in any wrapper, not just the one signature.
    .replace(/^[ \t]*[^\n]*(Malformed function call|default_api\.|tool_code|tool_outputs|<tool_call)[^\n]*$/gim, '')
    // 6. Residual un-fenced directive JSON: a bare `{"verb":…}` action or `{"steps":…}` tour the model
    //    emitted without a ```fence```. parseAutopilotDirectives parses + strips the valid ones (so they
    //    FIRE); this catches a malformed leftover, AND — second pattern — a still-streaming incomplete
    //    object (`{… "verb": …` with no closing brace yet) so it never flashes mid-stream.
    .replace(/^[ \t]*\{[^\n]*"(?:verb|steps)"\s*:[^\n]*\}[ \t]*,?[ \t]*$/gim, '')
    .replace(/^[ \t]*\{[^\n}]*"(?:verb|steps)"\s*:[^\n}]*$/gim, '')
    // tidy the gaps the removals leave
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')

export const parseAutopilotDirectives = (text: string): AutopilotDirectives => {
  const proposals: PortalActionProposal[] = []
  const suggestions: string[] = []
  let tour: PortalTour | undefined

  let cleaned = text.replace(PROPOSAL_FENCE, (_match, body: string) => {
    try {
      const parsed = JSON.parse(body.trim()) as PortalActionProposal
      if (parsed && typeof parsed.verb === 'string') {
        proposals.push(parsed)
      }
    } catch {
      // Malformed proposal block — drop it.
    }
    return ''
  })

  cleaned = cleaned.replace(SUGGEST_FENCE, (_match, body: string) => {
    try {
      const parsed = JSON.parse(body.trim()) as unknown
      if (Array.isArray(parsed)) {
        suggestions.push(...parsed.filter((entry): entry is string => typeof entry === 'string'))
      }
    } catch {
      // Malformed suggest block — drop it.
    }
    return ''
  })

  cleaned = cleaned.replace(TOUR_FENCE, (_match, body: string) => {
    try {
      const parsed = JSON.parse(body.trim()) as PortalTour
      const steps = Array.isArray(parsed?.steps)
        ? parsed.steps.filter((step) => step && typeof step.anchor === 'string' && typeof step.title === 'string')
        : []
      if (steps.length) {
        tour = { steps }
      }
    } catch {
      // Malformed tour block — drop it.
    }
    return ''
  })

  // Un-fenced fallback (the model forgot the ```fence```): parse a bare `{"verb":…}` action / a bare
  // `{"steps":…}` tour so it FIRES, and strip it so it never renders as literal JSON. Only strips a
  // line that parses as the expected shape — a malformed line is left for sanitizeChatText/display.
  cleaned = cleaned.replace(PROPOSAL_BARE, (match, body: string) => {
    try {
      const parsed = JSON.parse(body) as PortalActionProposal
      if (parsed && typeof parsed.verb === 'string') {
        proposals.push(parsed)
        return ''
      }
    } catch { /* not valid JSON — leave it */ }
    return match
  })
  cleaned = cleaned.replace(TOUR_BARE, (match, body: string) => {
    try {
      const parsed = JSON.parse(body) as PortalTour
      const steps = Array.isArray(parsed?.steps)
        ? parsed.steps.filter((step) => step && typeof step.anchor === 'string' && typeof step.title === 'string')
        : []
      if (steps.length) {
        tour = tour ?? { steps }
        return ''
      }
    } catch { /* not valid JSON — leave it */ }
    return match
  })

  return { cleanedText: sanitizeChatText(cleaned).trim(), proposals, suggestions, tour }
}

/**
 * The bridge hook. `apply` compiles ONE proposal to a canonical action and drives
 * the real dispatcher, returning the chip to show (or null if denied / not
 * drivable). Reuses `useHandleAction`, so RBAC + the URL-merge semantics are
 * exactly those of a hand-clicked control.
 */
/** Flatten the registered route tree to its concrete path patterns (excluding the `*` catch-all), so
 * a navigate target can be validated against REAL routes — a hallucinated path (`/admin`,
 * `/compositions/new`) matches nothing and is dropped, instead of "opening" a 404 the chat claims is X. */
const collectRoutePatterns = (routes: RouteObject[]): string[] => {
  const out: string[] = []
  const walk = (rs: RouteObject[]): void => {
    for (const route of rs) {
      if (typeof route.path === 'string' && route.path && route.path !== '*') {
        out.push(route.path)
      }
      if (route.children) {
        walk(route.children)
      }
    }
  }
  walk(routes)
  return out
}

export const useAutopilotActionBridge = () => {
  const { handleAction, handleActionSet } = useHandleAction()
  const queryClient = useQueryClient()
  const { routes } = useRoutesContext()
  const routePatterns = useMemo(() => collectRoutePatterns(routes), [routes])
  // previewBlueprint render transport. PREFERRED: the server-side `blueprint-render`
  // RESTAction fetched via snowplow `/call` (snowplowBaseUrl + frontendNamespace) — the
  // ClusterIP-only render service is never browser-exposed. FALLBACK: the legacy direct
  // browser fetch (renderBaseUrl = RENDER_API_BASE_URL). Neither → a graceful "unavailable"
  // chip (zero network).
  const { config } = useConfigContext()
  const snowplowBaseUrl = config?.api.SNOWPLOW_API_BASE_URL
  const frontendNamespace = config?.params.FRONTEND_NAMESPACE
  const renderBaseUrl = config?.api.RENDER_API_BASE_URL
  // FE-P4: the quarantined preview sandbox. Absent/empty = previewPage v2 OFF (v1
  // source preview) AND the applyResourceSet widgets/restactions carve-out fully closed.
  const sandboxNamespace = config?.api.PREVIEW_SANDBOX_NAMESPACE
  // The provider-scoped teardown session for the CURRENT live preview (epoch-guarded:
  // a stale drawer-close never deletes a newer preview's drafts). One per bridge owner.
  const [previewPageSession] = useState(createPreviewPageSession)

  // `origin` is the W0-3 provenance tag the provider passes at dispatch time (actor:'agent'
  // + its session id + the user's latest prompt). It is threaded into EVERY dispatch this
  // bridge drives, so a write reached through runAction / patchField / applyResourceSet is
  // audited as agent-originated; read-only verbs carry it harmlessly (no write → no record).
  const apply = useCallback(async (proposal: PortalActionProposal, origin?: WriteOrigin): Promise<AutopilotActionChip | null> => {
    // runAction: drive a REAL on-screen control (Sync/Pause/Edit/Delete) through the
    // SAME useHandleAction dispatcher the button uses — never a synthesized call. On a
    // mutating verb, requireConfirmation is FORCED (never trusted from the model), so the
    // dispatcher's own modal.confirm is the binding HITL gate; the user confirms.
    if (proposal.verb === 'runAction') {
      const found = lookupAction(queryClient, proposal.widget, proposal.actionId)
      if (!found) {
        return null
      }
      const verb = verbOf(found.action, found.resourcesRefs)
      const mutating = MUTATING_VERBS.has(verb)
      const toDispatch = mutating && found.action.type === 'rest'
        ? { ...found.action, requireConfirmation: true }
        : found.action
      await handleAction(toDispatch, found.resourcesRefs, undefined, undefined, origin)
      return { label: proposal.label ?? `${verb} ${proposal.widget ?? ''}`.trim(), readOnly: !mutating, verb: 'runAction' }
    }

    // patchField: the day-2 MUTATING branch. A SCOPED merge-patch of ONE spec field of the
    // on-page composition, compiled into a PATCH `rest` WidgetAction and dispatched through
    // this SAME useHandleAction dispatcher — so it hits runRest's W0-2 blast-radius gate (the
    // human confirms the exact diff). applyPatchField enforces the isPatchAllowed scoping
    // kernel (composition-only + single simple spec field) and returns null on any reject,
    // so a denied patch is a no-op exactly like an unknown verb — NEVER a bypass of the gate.
    if (proposal.verb === 'patchField') {
      // Bind the agent origin into the dispatcher the branch uses (patchField itself stays
      // origin-agnostic): the resulting PATCH is audited as agent-originated (W0-3).
      return applyPatchField(proposal as unknown as PatchFieldProposal, {
        handleAction: (action, resourcesRefs) => handleAction(action, resourcesRefs, undefined, undefined, origin),
      })
    }

    // applyResourceSet: the P1 applySet MUTATING branch (builder/fleet). An ORDERED set of
    // up to 10 Krateo-scoped writes compiled into the W0-4 fabric's WriteOps and dispatched
    // via handleActionSet → runRestSet — ONE aggregated blast-radius confirm for the WHOLE
    // set (ordered op list + per-op irreversible flag), sequential dispatch, stop on first
    // error. applyResourceSet enforces the isApplySetAllowed scoping kernel (≤10 ops;
    // groups ending in .krateo.io, or core ConfigMaps only) and returns null on any reject
    // or on the human's decline — a denied set is a no-op, NEVER a bypass of the gate.
    if (proposal.verb === 'applyResourceSet') {
      // Same origin binding for the set fabric: the ONE per-set audit record (W0-3) carries
      // actor:'agent' + the session/prompt context. `sandboxNamespace` arms the A.3
      // carve-out: widget-CR / restactions ops are allowed ONLY into that exact
      // namespace (absent config = they are always denied — never hand-applied).
      return applyResourceSet(proposal as unknown as ApplyResourceSetProposal, {
        handleActionSet: (ops) => handleActionSet(ops, origin),
        ...(sandboxNamespace ? { sandboxNamespace } : {}),
      })
    }

    // previewPage v2 (FE-P4): with a configured sandbox, previewPage becomes the LIVE
    // preview — validate (ajv, co-located schemas) → rewrite to the sandbox → apply via
    // the SAME runRestSet fabric (confirm skipped ONLY because every op is verified
    // sandbox-confined; provenance still records) → drawer on the root draft's REAL
    // widgetEndpoint → teardown on close. Absent config: falls through to the registry's
    // v1 zero-network source preview, byte-identical to before this branch existed.
    if (proposal.verb === 'previewPage' && sandboxNamespace) {
      return applyPreviewPageV2(proposal, {
        handleActionSet: (ops, options) => handleActionSet(ops, origin, options),
        sandboxNamespace,
        session: previewPageSession,
        sessionId: origin?.agentSessionId ?? 'unattributed',
      })
    }

    // Deny-by-default via the DATA in READONLY_VERB_REGISTRY: a verb absent from the
    // registry — OR any entry declaring sideEffect:'write' — returns null (denied) and
    // never reaches a dispatch. Only a registered `read` verb whose argSchema matches is
    // compiled + driven through the same real dispatcher a hand-clicked control uses.
    const spec = READONLY_VERB_REGISTRY[proposal.verb]
    if (!spec || spec.sideEffect !== 'read' || !spec.argSchema(proposal)) {
      return null
    }
    return spec.apply(proposal, { frontendNamespace, handleAction, renderBaseUrl, routePatterns, snowplowBaseUrl })
  }, [frontendNamespace, handleAction, handleActionSet, previewPageSession, queryClient, renderBaseUrl, routePatterns, sandboxNamespace, snowplowBaseUrl])

  return { apply }
}
