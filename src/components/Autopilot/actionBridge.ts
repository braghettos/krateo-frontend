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

import { useCallback } from 'react'

import { useHandleAction } from '../../hooks/useHandleActions'
import type { ResourcesRefs } from '../../types/Widget'

import type { AutopilotActionChip } from './types'

/** navigate needs no page refs; openDrawer/openModal will pass resolved refs. */
const EMPTY_REFS: ResourcesRefs = { items: [] }

export interface PortalActionProposal {
  /** One of the read-only verbs; anything else is denied. */
  verb: string
  /** navigate: the client-side route (e.g. "/compositions/krateo-system/portal"). */
  route?: string
  /** setExtras: whitelisted URL scope params merged into the current path. */
  extras?: Record<string, string>
  /** openDrawer/openModal: a resourceRefId resolved against the page's refs. */
  resourceRefId?: string
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
  'You can operate the Krateo portal READ-ONLY navigation for the user by emitting ONE fenced code block.',
  'When the user asks to open / show / go to / filter something that exists in the portal, include EXACTLY this in your reply:',
  '```portal-action',
  '{"verb":"navigate","route":"<path>","label":"<short label>"}',
  '```',
  'Read-only verbs: navigate (route, e.g. /compositions/<ns>/<name>, /blueprints, /marketplace, /dashboard, /settings); setExtras (an extras object with status/range/q to scope the current list).',
  'This drives the real UI (read-only) — it is NOT a platform change. Emit at most one block per reply and still explain briefly in prose. Only propose routes/entities present in the page context.',
  '</portal_capabilities>',
].join('\n')

const PROPOSAL_FENCE = /```portal-action\s*\n([\s\S]*?)```/g

/**
 * Extract + STRIP `portal-action` fenced blocks from assistant text. Returns the
 * cleaned prose (the JSON never shows to the user — it becomes an action chip) and
 * the parsed proposals. Malformed blocks are dropped.
 */
export const parseProposals = (text: string): { cleanedText: string; proposals: PortalActionProposal[] } => {
  const proposals: PortalActionProposal[] = []
  const cleanedText = text.replace(PROPOSAL_FENCE, (_match, body: string) => {
    try {
      const parsed = JSON.parse(body.trim()) as PortalActionProposal
      if (parsed && typeof parsed.verb === 'string') {
        proposals.push(parsed)
      }
    } catch {
      // Malformed proposal block — drop it.
    }
    return ''
  }).trim()
  return { cleanedText, proposals }
}

/**
 * The bridge hook. `apply` compiles ONE proposal to a canonical action and drives
 * the real dispatcher, returning the chip to show (or null if denied / not
 * drivable). Reuses `useHandleAction`, so RBAC + the URL-merge semantics are
 * exactly those of a hand-clicked control.
 */
export const useAutopilotActionBridge = () => {
  const { handleAction } = useHandleAction()

  const apply = useCallback(async (proposal: PortalActionProposal): Promise<AutopilotActionChip | null> => {
    // Deny-by-default: only the read-only verbs are ever executed.
    if (!READONLY_VERBS.has(proposal.verb)) {
      return null
    }

    if (proposal.verb === 'navigate') {
      if (!proposal.route) {
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
  }, [handleAction])

  return { apply }
}
