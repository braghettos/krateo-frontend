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
import { useCallback, useMemo } from 'react'
import { matchPath, type RouteObject } from 'react-router'

import { useRoutesContext } from '../../context/RoutesContext'
import { useHandleAction } from '../../hooks/useHandleActions'
import type { ResourcesRefs, WidgetAction } from '../../types/Widget'

import type { AutopilotActionChip } from './types'

/** navigate needs no page refs; openDrawer/openModal will pass resolved refs. */
const EMPTY_REFS: ResourcesRefs = { items: [] }

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
  /** Human-readable label for the auto-applied action chip. */
  label?: string
}

const READONLY_VERBS = new Set(['navigate', 'setExtras', 'openDrawer', 'openModal'])
const EXTRAS_WHITELIST = ['status', 'range', 'q']

/** A same-path URL carrying only whitelisted extras (merged by resolveNavigationTarget). */
const buildExtrasPath = (extras: Record<string, string> | undefined): string | null => {
  if (!extras) {
    return null
  }
  const params = new URLSearchParams()
  for (const key of EXTRAS_WHITELIST) {
    if (extras[key]) {
      params.set(key, extras[key])
    }
  }
  const query = params.toString()
  return query ? `${window.location.pathname}?${query}` : null
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
  const { handleAction } = useHandleAction()
  const queryClient = useQueryClient()
  const { routes } = useRoutesContext()
  const routePatterns = useMemo(() => collectRoutePatterns(routes), [routes])

  const apply = useCallback(async (proposal: PortalActionProposal): Promise<AutopilotActionChip | null> => {
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
      await handleAction(toDispatch, found.resourcesRefs)
      return { label: proposal.label ?? `${verb} ${proposal.widget ?? ''}`.trim(), readOnly: !mutating, verb: 'runAction' }
    }

    // Deny-by-default: only the read-only verbs are ever executed.
    if (!READONLY_VERBS.has(proposal.verb)) {
      return null
    }

    if (proposal.verb === 'navigate') {
      if (!proposal.route) {
        return null
      }
      // Validate against the registered route patterns: a hallucinated path that matches no real route
      // (e.g. `/compositions/new`, `/admin`) is a no-op, never a synthesized navigation to a 404 the
      // chat would still narrate as "opening X". (A param route like /compositions/:ns/:name still
      // matches by shape — but the agent now sees real resource names in the page context, so it has no
      // reason to invent one.)
      const [pathname] = proposal.route.split(/[?#]/)
      // Fail OPEN if the route table hasn't registered yet (never block ALL navigation); otherwise the
      // path must match a real registered route pattern.
      const known = routePatterns.length === 0 || routePatterns.some((pattern) => matchPath(pattern, pathname) !== null)
      if (!known) {
        return null
      }
      await handleAction({ id: 'autopilot-navigate', path: proposal.route, type: 'navigate' }, EMPTY_REFS)
      return { label: proposal.label ?? `open ${proposal.route}`, readOnly: true, verb: 'navigate' }
    }

    if (proposal.verb === 'setExtras') {
      const path = buildExtrasPath(proposal.extras)
      if (!path) {
        return null
      }
      await handleAction({ id: 'autopilot-set-extras', path, type: 'navigate' }, EMPTY_REFS)
      const summary = Object.entries(proposal.extras ?? {})
        .filter(([key]) => EXTRAS_WHITELIST.includes(key))
        .map(([key, value]) => `${key}=${value}`)
        .join(' ')
      return { label: proposal.label ?? `scope ${summary}`, readOnly: true, verb: 'setExtras' }
    }

    // openDrawer / openModal need a resourceRefId resolved against the page's
    // allowed resourcesRefs (collected from the widget cache). Deferred to the next
    // increment; returning null keeps deny-by-default honest (no silent fake).
    return null
  }, [handleAction, queryClient, routePatterns])

  return { apply }
}
