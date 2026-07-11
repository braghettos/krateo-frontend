/**
 * Wave-4 preview verb handlers (W0-1 extension seam). These are DENY-BY-DEFAULT
 * read-only registry entries — they mutate NOTHING and auto-apply like navigate.
 * Each is a one-line `VerbSpec` registered into the shared read-only registry, so
 * `isReadOnlyVerb()` resolves them and the bridge dispatches them through the same
 * registry path as the four seed verbs.
 *
 *   - previewBlueprint: navigate to the blueprint request/create form at
 *     `/blueprints/<ns>/<name>/new` WITHOUT any prefill (no agentDraft) — purely a
 *     validated route change so the user reviews the empty Configure form.
 *   - previewPage: a validated navigate reusing the SAME route-pattern validation as
 *     navigate; a hallucinated preview route (matching no real route) is dropped.
 *
 * NOTE: the proposal fields these read (`namespace`/`ns`, `name`, `route`) are declared
 * on PortalActionProposal in actionBridge.ts — no new verb string literals leak into
 * the shared types.ts (they live locally as the registry keys below).
 */
import { EMPTY_REFS, isKnownRoute, registerReadOnlyVerb, type VerbSpec } from './verbRegistry'

/** The blueprint namespace + name from a preview proposal (accepts `ns` or `namespace`). */
const blueprintTarget = (proposal: { namespace?: string; ns?: string; name?: string }): { ns: string; name: string } | null => {
  const ns = proposal.namespace ?? proposal.ns
  const { name } = proposal
  return ns && name ? { name, ns } : null
}

/**
 * previewBlueprint → navigate to `/blueprints/<ns>/<name>/new` with NO prefill. It is
 * a read-only route change (the empty Configure form), validated against the real
 * route table exactly like navigate; a missing ns/name or an unregistered route is a
 * no-op. It does NOT touch agentDraft — previewing is not drafting.
 */
export const previewBlueprintSpec: VerbSpec = {
  apply: async (proposal, deps) => {
    const target = blueprintTarget(proposal)
    if (!target) {
      return null
    }
    const route = `/blueprints/${target.ns}/${target.name}/new`
    if (!isKnownRoute(route, deps.routePatterns)) {
      return null
    }
    await deps.handleAction({ id: 'autopilot-preview-blueprint', path: route, type: 'navigate' }, EMPTY_REFS)
    return { label: proposal.label ?? `preview ${target.name}`, readOnly: true, verb: 'previewBlueprint' }
  },
  argSchema: (proposal) => blueprintTarget(proposal) !== null,
  name: 'previewBlueprint',
  sideEffect: 'read',
}

/**
 * previewPage → a validated navigate reusing the existing route-pattern validation. A
 * hallucinated preview route (matching no registered route) is dropped, so the chat
 * can never narrate "previewing X" while opening a 404.
 */
export const previewPageSpec: VerbSpec = {
  apply: async (proposal, deps) => {
    if (!proposal.route || !isKnownRoute(proposal.route, deps.routePatterns)) {
      return null
    }
    await deps.handleAction({ id: 'autopilot-preview-page', path: proposal.route, type: 'navigate' }, EMPTY_REFS)
    return { label: proposal.label ?? `preview ${proposal.route}`, readOnly: true, verb: 'previewPage' }
  },
  argSchema: (proposal) => typeof proposal.route === 'string' && proposal.route.length > 0,
  name: 'previewPage',
  sideEffect: 'read',
}

// Seed the preview verbs into the shared read-only registry (one-line entries). This
// runs on module load; actionBridge.ts imports this module so the entries are present
// before any apply() dispatch.
registerReadOnlyVerb(previewBlueprintSpec)
registerReadOnlyVerb(previewPageSpec)
