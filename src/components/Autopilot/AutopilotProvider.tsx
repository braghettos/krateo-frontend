/**
 * Autopilot state machine + React context. Owns the rail open state, the
 * frontend-owned session/thread id (new-thread issues a fresh one), the transcript,
 * the streaming flag, and `send()`. It wires the context collector → delta budget →
 * redactor → transport, and folds normalized frames back into the transcript.
 *
 * Mounted inside `ShellRoute` (under ConfigProvider + QueryClientProvider + Router),
 * so it has the live widget cache, identity, route, and the dispatcher the Phase-2
 * bridge will reuse. The rail/toggle render only when Autopilot is `enabled`
 * (endpoint configured, or the dev echo flag) — graceful absence otherwise.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useConfigContext } from '../../context/ConfigContext'
import type { WriteOrigin } from '../../hooks/provenance'
import { randomId } from '../../utils/utils'

import type { PortalActionProposal, PortalTour } from './actionBridge'
import { GROUNDING_GUARDRAIL_PROMPT, PORTAL_CAPABILITIES_PROMPT, PORTAL_HOUSE_RULES, parseAutopilotDirectives, sanitizeChatText, useAutopilotActionBridge } from './actionBridge'
import { AgentDraftProvider } from './agentDraft'
import type { ApplyResourceSetOp } from './applyResourceSet'
import type { ApprovalDecision, ApprovalGovernor, ApprovalPause } from './approval'
import { createApprovalGovernor, summarizeApprovalTools } from './approval'
import { stampAuthorship, type AuthorshipOrigin } from './authorship'
import { draftDisplayName, lintBlueprintDraft } from './blueprintDraft'
import { createBlueprintDraftStore, substituteFileContent, type BlueprintDraftHeld } from './blueprintDraftStore'
import { createBlueprintGate } from './blueprintGate'
import { createOasAttachmentStore, substituteOasAttachment, type OasAttachment, type OasAttachmentResult } from './oasAttachment'
import { createPreviewGate } from './previewGate'
import { AutopilotPreviewDrawer } from './previewSurface'
import { createEchoTransport, createKagentTransport } from './transport'
import type { AutopilotActionChip, AutopilotFrame, AutopilotMessage, AutopilotTransport, PageContextEnvelope } from './types'
import { buildContextDelta, useAutopilotContext } from './useAutopilotContext'

/** A preview-gate verdict shape (both the KOG and blueprint gates match this). */
type GateVerdict = { allowed: true } | { allowed: false; reason: string }

/** The compiled publish set, or the first denial reason (nothing dispatched). */
interface PublishCompileResult {
  denial: string | null
  ops: ApplyResourceSetOp[] | null
}

/**
 * The applyResourceSet publish-compile pipeline, factored out of finalize (flat early
 * returns — the finalize branch is already 3 deep). Order: both preview gates, then the
 * $oasAttachment + $fileContent substitutions (held bytes replace the tokens), then the
 * host authorship stamp. Any gate/substitution failure short-circuits to a denial with
 * NO compiled ops; success yields the stamped, ready-to-dispatch ops.
 */
const compilePublishOps = (
  ops: readonly ApplyResourceSetOp[] | undefined,
  kogVerdict: GateVerdict,
  blueprintVerdict: GateVerdict,
  oasAttachment: OasAttachment | null,
  blueprintHeld: BlueprintDraftHeld | null,
  origin: AuthorshipOrigin,
): PublishCompileResult => {
  if (!kogVerdict.allowed) {
    return { denial: kogVerdict.reason, ops: null }
  }
  if (!blueprintVerdict.allowed) {
    return { denial: blueprintVerdict.reason, ops: null }
  }
  const oasCompiled = substituteOasAttachment(ops ?? [], oasAttachment)
  if (!oasCompiled.ok) {
    return { denial: oasCompiled.error, ops: null }
  }
  // base64: every $fileContent token is a RepoContent `.spec.content` value (the BLUEPRINT
  // BUILDER prompt is its sole emitter), and GitHub's create-or-update-file API requires the
  // file bytes base64-encoded. Without this the chart files ship as raw text and GitHub 422s
  // at publish (FE-BP5 — the git-provider CR shape is now verified: content = base64).
  const fileCompiled = substituteFileContent(oasCompiled.ops, blueprintHeld, 'base64')
  if (!fileCompiled.ok) {
    return { denial: fileCompiled.error, ops: null }
  }
  return { denial: null, ops: stampAuthorship(fileCompiled.ops, origin) }
}

interface AutopilotContextValue {
  /** Whether Autopilot is configured/available (controls rail + toggle visibility). */
  enabled: boolean
  /** Whether the docked rail is open. */
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  /** The conversation transcript for the current thread. */
  messages: AutopilotMessage[]
  /** True while an assistant turn is streaming. */
  streaming: boolean
  /** Send a user turn. No-op on empty text or while streaming. */
  send: (text: string) => void
  /** Reset the thread: abort, clear transcript, new session id. */
  newThread: () => void
  /** The kagent HITL approval pause awaiting a decision (null when none). */
  pendingApproval: ApprovalPause | null
  /** Approve the pending tool call(s) and resume the paused task. */
  approvePending: () => void
  /** Deny the pending tool call(s) — also the dismiss path (deny-by-default). */
  denyPending: () => void
  /** Snapshot the live page context (for the rail's context strip). */
  collect: () => PageContextEnvelope
  /** W4 KOG (FE-K2): the held OAS attachment's size, or null when nothing is held.
   * The DOCUMENT itself never leaves the provider's store — it is NOT in the page
   * context (collect() never sees it) and is substituted only at publish time. */
  oasAttachment: { bytes: number } | null
  /** Hold a pasted OpenAPI document (512 KiB cap). Returns the cap error on reject. */
  attachOasDocument: (text: string) => OasAttachmentResult
  /** Drop the held OAS attachment. */
  clearOasAttachment: () => void
  /** Active guided spotlight tour, if one was proposed (null otherwise). */
  tour: PortalTour | null
  /** Whether the tour overlay is open. */
  tourOpen: boolean
  /** Dismiss the active tour. */
  closeTour: () => void
}

const AutopilotReactContext = createContext<AutopilotContextValue | null>(null)

const newSessionId = (): string => `s_${randomId()}`

export const AutopilotProvider = ({ children }: { children: React.ReactNode }) => {
  const { config } = useConfigContext()
  const endpoint = config?.api.AUTOPILOT_API_BASE_URL
  // Dev/demo escape hatch: an "echo" endpoint (or VITE_AUTOPILOT_ECHO) drives the
  // local stub transport so the rail is exercisable before the live A2A handshake.
  const useEcho = endpoint === 'echo' || (import.meta.env.DEV && import.meta.env.VITE_AUTOPILOT_ECHO === 'true')
  const enabled = Boolean(endpoint) || useEcho

  const { collect } = useAutopilotContext()
  const { apply } = useAutopilotActionBridge()

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AutopilotMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [sessionId, setSessionId] = useState<string>(newSessionId)
  const [tour, setTour] = useState<PortalTour | null>(null)
  const [tourOpen, setTourOpen] = useState(false)
  // Autopilot form draft (Phase 3 gated form-fill). The nonce re-keys the Form so a
  // new draft re-applies (antd initialValues is mount-only).
  const [agentDraft, setAgentDraft] = useState<Record<string, unknown> | null>(null)
  const [draftNonce, setDraftNonce] = useState(0)
  // kagent HITL (Phase 2): the current `input-required` approval pause, mirrored in
  // state for the rail card and in a ref (with its deny-by-default governor) for the
  // decision paths. Exactly one pause can be pending at a time — kagent aggregates all
  // paused tool calls of a turn into one input-required task status.
  const [pendingApproval, setPendingApproval] = useState<ApprovalPause | null>(null)
  // W4 KOG (FE-K3): the thread-scoped PREVIEW GATE — records every applied
  // previewRestDef and denies an applyResourceSet that writes restdefinitions unless
  // a matching (kind+resourceGroup) draft was previewed this thread. Reset on newThread.
  const [previewGate] = useState(createPreviewGate)
  // W4 KOG (FE-K2): the held OAS attachment. The store keeps the verbatim pasted
  // document OUTSIDE the page-context path (collect()/redactor never touch it, the
  // collected context does not grow); `oasHeld` mirrors only its SIZE for the rail.
  const [oasStore] = useState(createOasAttachmentStore)
  const [oasHeld, setOasHeld] = useState<{ bytes: number } | null>(null)
  // W4 BLUEPRINT-BUILDER: the thread-scoped BLUEPRINT preview gate (FE-BP2) records every
  // previewed chart name and denies a blueprint publish (git-write CRs / a register
  // CompositionDefinition) unless the CURRENTLY-HELD draft was previewed this thread; and
  // the held previewed chart tree (FE-BP1), kept OUTSIDE the page-context path like
  // oasStore — its bytes fill $fileContent tokens at publish-compile so published bytes ==
  // previewed bytes. Both reset on newThread.
  const [blueprintGate] = useState(createBlueprintGate)
  const [blueprintStore] = useState(createBlueprintDraftStore)

  const abortRef = useRef<(() => void) | null>(null)
  const approvalRef = useRef<{ governor: ApprovalGovernor; pause: ApprovalPause } | null>(null)
  // The governor's timeout closure calls back into dispatchDecision, which itself
  // depends on applyFrame (which arms governors) — break the useCallback cycle with a
  // ref kept current by the effect below.
  const timeoutDenyRef = useRef((_pause: ApprovalPause): void => undefined)
  const sentFirstRef = useRef(false)
  // Guards the one-shot `?ask=` deep-link (below) so it fires a single turn per visit.
  const askHandledRef = useRef(false)
  const lastEnvelopeRef = useRef<PageContextEnvelope | undefined>(undefined)
  // A2A conversation id, assigned by the server on the first turn and replayed on
  // follow-ups for thread continuity. Cleared on new-thread.
  const contextIdRef = useRef<string | undefined>(undefined)
  // Accumulated raw assistant text + pending proposals per in-flight turn, used to
  // finalize (strip fenced proposals, auto-apply read-only actions) on `done`.
  const assistantTextRef = useRef<Map<string, string>>(new Map())
  const proposalsRef = useRef<Map<string, PortalActionProposal[]>>(new Map())
  // Assistant turns already finalized, so a duplicate `done` frame can't re-run finalize
  // (which deletes the text buffer and would otherwise wipe the rendered answer).
  const finalizedRef = useRef<Set<string>>(new Set())
  // The user's latest message text — so finalize can gate a proposed tour on an EXPLICIT walk-me-through
  // request (the model still emits tours on direct actions despite the prompt; the host enforces it).
  const lastUserTextRef = useRef('')

  const transport: AutopilotTransport = useMemo(
    () => (endpoint && endpoint !== 'echo' ? createKagentTransport(endpoint) : createEchoTransport()),
    [endpoint],
  )

  // Abort any in-flight stream when the provider unmounts; disarm (without deciding)
  // any pending approval governor so its timer can't fire into an unmounted tree.
  useEffect(() => () => {
    abortRef.current?.()
    approvalRef.current?.governor.dispose()
  }, [])

  // On stream end: strip fenced `portal-action` blocks from the assistant text, then
  // auto-apply the read-only proposals (from tool_call frames + fenced blocks) through
  // the REAL dispatcher, attaching a chip per applied action. The bridge denies any
  // non-read-only verb, so this never mutates.
  const finalize = useCallback(async (assistantId: string) => {
    // A turn can receive `done` more than once (the `completed` status event AND the
    // transport's stream-close fallback). finalize() deletes the per-turn text buffer, so a
    // second run would read an empty buffer and WIPE the rendered answer. Finalize once.
    if (finalizedRef.current.has(assistantId)) {
      return
    }
    finalizedRef.current.add(assistantId)
    const rawText = assistantTextRef.current.get(assistantId) ?? ''
    const { cleanedText, proposals: textProposals, suggestions, tour: proposedTour } = parseAutopilotDirectives(rawText)
    const toolProposals = proposalsRef.current.get(assistantId) ?? []
    assistantTextRef.current.delete(assistantId)
    proposalsRef.current.delete(assistantId)

    setMessages((prev) => prev.map((message) => (
      message.id === assistantId
        ? { ...message, streaming: false, suggestions: suggestions.length ? suggestions : undefined, text: cleanedText }
        : message
    )))
    setStreaming(false)

    const chips: AutopilotActionChip[] = []
    // At most ONE action per reply — now ENFORCED, not just requested in the prompt. A model that
    // emits two navigates (or a duplicated tool_call + a fenced block) would otherwise run them
    // sequentially, flashing the page A then B while only the last chip's label matches. Take the first.
    const [proposal] = [...toolProposals, ...textProposals]
    if (proposal) {
      // W0-3 provenance: tag the dispatch as agent-origin with the identity context the
      // provider actually holds at dispatch time — the frontend-owned session id and the
      // user's latest chat message (the prompt that produced this proposal). If a write
      // is reached (a mutating runAction / patchField / applyResourceSet), its audit
      // record carries actor:'agent' + this context; read-only verbs never record.
      const origin: WriteOrigin = {
        actor: 'agent',
        agentSessionId: sessionId,
        ...(lastUserTextRef.current ? { prompt: lastUserTextRef.current } : {}),
      }
      if (proposal.verb === 'prefillForm') {
        // prefillForm sets provider state (not a dispatcher action): the mounted Form merges these into
        // its values; the user still reviews + submits via the form's own gate. Autopilot never submits.
        setAgentDraft(proposal.values ?? {})
        setDraftNonce((nonce) => nonce + 1)
        chips.push({ label: proposal.label ?? 'drafted the create form', readOnly: true, verb: 'prefillForm' })
      } else if (proposal.verb === 'applyResourceSet') {
        // Publish path, enforced HERE (finalize is the single entry point for model
        // proposals). Host-side checks BEFORE the bridge ever dispatches — a denial is the
        // standard denied chip (nothing dispatched, readOnly/honest):
        //  1a. KOG PREVIEW GATE (FE-K3): a set writing restdefinitions needs a matching
        //      (kind+resourceGroup) previewRestDef this thread.
        //  1b. BLUEPRINT PREVIEW GATE (FE-BP2): a blueprint publish (git-write CRs / a
        //      register CompositionDefinition) needs the CURRENTLY-HELD draft previewed.
        //  2a. $oasAttachment substitution (FE-K2): the held OAS replaces the token.
        //  2b. $fileContent substitution (FE-BP1): the held chart tree replaces per-file
        //      tokens, so published bytes == previewed bytes.
        //  3.  AUTHORSHIP stamp (FE-BP3): host-inject managed-by/authored-by/session/prompt
        //      onto every authored object (ownership can't be omitted or spoofed).
        // All at compile time — BEFORE the blast-radius confirm, so the human confirms the
        // REAL, owned payload.
        const held = blueprintStore.get()
        const heldChartName = held ? draftDisplayName(held.files) : null
        const { denial, ops: compiledOps } = compilePublishOps(
          proposal.ops,
          previewGate.evaluate(proposal.ops),
          blueprintGate.evaluate(proposal.ops, heldChartName),
          oasStore.get(),
          held,
          { prompt: lastUserTextRef.current, sessionId },
        )
        if (denial !== null) {
          chips.push({ label: denial, readOnly: true, verb: 'applyResourceSet' })
        } else if (compiledOps) {
          const chip = await apply({ ...proposal, ops: compiledOps }, origin)
          if (chip) {
            chips.push(chip)
          }
        }
      } else {
        const chip = await apply(proposal, origin)
        if (chip) {
          chips.push(chip)
          // W4 KOG (FE-K3): an APPLIED previewRestDef (chip ⇒ the drawer opened on a
          // parseable draft) arms the preview gate for that draft's kind+resourceGroup.
          if (proposal.verb === 'previewRestDef') {
            previewGate.recordPreview(proposal.restDefinition)
          } else if (proposal.verb === 'previewBlueprint' && proposal.rawTemplates && lintBlueprintDraft(proposal.rawTemplates).length === 0) {
            // FE-BP1/BP2: an APPLIED, lint-clean inline-draft previewBlueprint HOLDS the
            // previewed tree (so publish substitutes the SAME bytes) and arms the blueprint
            // gate for its Chart.yaml name. A remote-chart preview (no rawTemplates) holds
            // nothing — there is no authored tree to publish via git.
            const draft = blueprintStore.set(proposal.rawTemplates)
            if (draft.ok) {
              blueprintGate.recordPreview(draftDisplayName(draft.held.files))
            }
          }
        }
      }
    }
    if (chips.length) {
      setMessages((prev) => prev.map((message) => (
        message.id === assistantId ? { ...message, actions: chips } : message
      )))
    }

    // Start a guided spotlight tour AFTER applying the proposals, so a navigate/prefill in
    // the same reply has settled the destination page / filled the form before the tour
    // resolves its DOM anchors (an unsettled page would degrade every step to centered).
    // Host-side tour gate: honor a proposed tour ONLY if the user literally asked to be walked through.
    // The prompt says tours are off-by-default, but the model still emits them on direct actions
    // ("install it for me"); the host enforces the rule deterministically (prompts decay across a thread).
    const userAskedForTour = /\b(walk me through|guide me|show me around|walk through)\b/i.test(lastUserTextRef.current)
    if (proposedTour && userAskedForTour) {
      setTour(proposedTour)
      setTourOpen(true)
    }
  }, [apply, blueprintGate, blueprintStore, oasStore, previewGate, sessionId])

  const applyFrame = useCallback((assistantId: string, frame: AutopilotFrame) => {
    switch (frame.kind) {
      case 'text': {
        const current = assistantTextRef.current.get(assistantId) ?? ''
        const next = frame.replace ? frame.delta : current + frame.delta
        // Keep the RAW text in the buffer (finalize parses directive fences from it), but render a
        // sanitized view so a raw tool-call echo never flashes on screen mid-stream.
        assistantTextRef.current.set(assistantId, next)
        const rendered = sanitizeChatText(next)
        setMessages((prev) => prev.map((message) => (
          message.id === assistantId ? { ...message, text: rendered } : message
        )))
        break
      }
      case 'session':
        contextIdRef.current = frame.contextId
        break
      case 'tool_call':
        if (frame.name === 'propose_portal_action' && frame.args && typeof frame.args === 'object') {
          const list = proposalsRef.current.get(assistantId) ?? []
          list.push(frame.args as PortalActionProposal)
          proposalsRef.current.set(assistantId, list)
        }
        break
      case 'error':
        assistantTextRef.current.delete(assistantId)
        proposalsRef.current.delete(assistantId)
        setMessages((prev) => prev.map((message) => (
          message.id === assistantId
            ? { ...message, streaming: false, text: `${message.text}\n\n⚠ ${frame.message}`.trim() }
            : message
        )))
        setStreaming(false)
        break
      case 'done':
        void finalize(assistantId)
        break
      case 'require_approval': {
        // kagent paused on a `requireApproval` tool call (task → input-required).
        // Store the pause for the rail card and arm DENY-BY-DEFAULT: an unattended
        // approval self-denies after 5 minutes (via timeoutDenyRef, kept current below).
        approvalRef.current?.governor.dispose()
        const governor = createApprovalGovernor(() => timeoutDenyRef.current(frame.pause))
        approvalRef.current = { governor, pause: frame.pause }
        setPendingApproval(frame.pause)
        break
      }
      default:
        break
    }
  }, [finalize])

  // Send a HITL decision over A2A (the `{decision_type}` DataPart on the paused task —
  // see approval.ts) and stream the agent's continuation into a NEW assistant bubble,
  // stamped with a decision chip so the transcript records what was decided.
  //
  // PROVENANCE — assessed and SKIPPED (deliberately): the W0-3 fabric on this branch
  // (recordProvenance) audits PORTAL writes and requires a BlastRadius (verb + GVR +
  // namespace of the apiserver target) plus an HTTP outcome. A kagent approval carries
  // only {toolName, args}; deriving a GVR/namespace would mean client-side parsing of
  // the manifest string (against the server-side-computation rule, and a fabrication
  // risk), and emitAuditRecord hard-skips records with no resolvable namespace anyway.
  // Forcing the mapping would produce empty/false audit targets — the kagent task
  // history already records the decision server-side. Revisit if the AuditRecord CRD
  // grows a tool-approval action shape.
  const dispatchDecision = useCallback((decision: ApprovalDecision, pause: ApprovalPause, chipLabel: string) => {
    const assistantId = randomId()
    setMessages((prev) => [
      ...prev,
      {
        actions: [{ label: chipLabel, readOnly: decision.type === 'reject', verb: 'approval' }],
        createdAt: Date.now(),
        id: assistantId,
        role: 'assistant',
        streaming: true,
        text: '',
      },
    ])
    setStreaming(true)
    abortRef.current = transport.respondToApproval(decision, pause, { onFrame: (frame) => applyFrame(assistantId, frame) })
  }, [applyFrame, transport])

  // Keep the governor-timeout path pointing at the CURRENT dispatchDecision (the
  // governor closure is created inside applyFrame and must not go stale).
  useEffect(() => {
    timeoutDenyRef.current = (pause: ApprovalPause) => {
      approvalRef.current = null
      setPendingApproval(null)
      dispatchDecision(
        { reason: 'Auto-denied: no decision within 5 minutes (deny-by-default).', type: 'reject' },
        pause,
        `timed out — denied ${summarizeApprovalTools(pause)}`,
      )
    }
  }, [dispatchDecision])

  // User-driven decision (Approve / Deny / dismiss). The governor's settle() is the
  // single-decision gate: false means the pause was already decided or timed out.
  const resolveApproval = useCallback((decision: ApprovalDecision) => {
    const active = approvalRef.current
    if (!active || !active.governor.settle()) {
      return
    }
    approvalRef.current = null
    setPendingApproval(null)
    const tools = summarizeApprovalTools(active.pause)
    dispatchDecision(decision, active.pause, decision.type === 'approve' ? `approved ${tools}` : `denied ${tools}`)
  }, [dispatchDecision])

  const approvePending = useCallback(() => resolveApproval({ type: 'approve' }), [resolveApproval])
  const denyPending = useCallback(
    () => resolveApproval({ reason: 'Denied by the user in the Autopilot rail.', type: 'reject' }),
    [resolveApproval],
  )

  const send = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed || streaming) {
      return
    }
    lastUserTextRef.current = trimmed

    const envelope = collect()
    const firstTurn = !sentFirstRef.current
    sentFirstRef.current = true
    const baseContext = buildContextDelta(envelope, lastEnvelopeRef.current)
    lastEnvelopeRef.current = envelope
    // Assemble the trusted-instruction preamble (outside the page_context data-fence). The
    // anti-confabulation GROUNDING_GUARDRAIL_PROMPT leads EVERY turn — guardrails decay across a long
    // A2A thread, and it must be present on the exact turn a page-load question is asked (the
    // crashloop-pod confabulation bug). Then:
    //  - Turn 1: teach the full read-only proposal protocol (PORTAL_CAPABILITIES_PROMPT). The A2A
    //    contextId thread remembers it, so later turns don't re-send the ~30-line block.
    //  - Later turns: re-inject the tight HOUSE RULES recap instead — the full protocol decays as the
    //    thread grows, and create/diagnose/install all happen on later turns, exactly where the model
    //    was dropping the no-YAML / no-tour / no-invented-state guards.
    const contextString = firstTurn
      ? `${GROUNDING_GUARDRAIL_PROMPT}\n\n${PORTAL_CAPABILITIES_PROMPT}\n\n${baseContext}`
      : `${GROUNDING_GUARDRAIL_PROMPT}\n\n${PORTAL_HOUSE_RULES}\n\n${baseContext}`

    const assistantId = randomId()
    const now = Date.now()
    setMessages((prev) => [
      ...prev,
      { createdAt: now, id: randomId(), role: 'user', text: trimmed },
      { createdAt: now, id: assistantId, role: 'assistant', streaming: true, text: '' },
    ])
    setStreaming(true)

    abortRef.current = transport.send(
      { context: contextString, contextId: contextIdRef.current, firstTurn, sessionId, text: trimmed },
      { onFrame: (frame) => applyFrame(assistantId, frame) },
    )
  }, [applyFrame, collect, sessionId, streaming, transport])

  const newThread = useCallback(() => {
    abortRef.current?.()
    abortRef.current = null
    // DENY-BY-DEFAULT on thread reset: a pending approval is rejected (fire-and-forget,
    // no-op handlers — the new thread does not render the released task's stream) so
    // the paused kagent task is never left dangling toward an approve.
    const active = approvalRef.current
    if (active && active.governor.settle()) {
      transport.respondToApproval(
        { reason: 'Denied: the user started a new thread (deny-by-default).', type: 'reject' },
        active.pause,
        { onFrame: () => undefined },
      )
    }
    approvalRef.current = null
    setPendingApproval(null)
    sentFirstRef.current = false
    lastEnvelopeRef.current = undefined
    contextIdRef.current = undefined
    assistantTextRef.current.clear()
    proposalsRef.current.clear()
    finalizedRef.current.clear()
    setMessages([])
    setStreaming(false)
    setSessionId(newSessionId())
    setTour(null)
    setTourOpen(false)
    // Clear any pending form draft and re-key (bump nonce) so the form reverts to base.
    setAgentDraft(null)
    setDraftNonce((nonce) => nonce + 1)
    // W4 KOG + BLUEPRINT: the preview gates are THREAD-scoped — a new thread forgets every
    // recorded preview (publish is denied again until re-previewed), and the held OAS
    // attachment + blueprint draft are dropped with the conversation that produced them
    // (deny-by-default posture).
    previewGate.reset()
    blueprintGate.reset()
    oasStore.clear()
    blueprintStore.clear()
    setOasHeld(null)
  }, [blueprintGate, blueprintStore, oasStore, previewGate, transport])

  // W4 KOG (FE-K2): hold / drop a pasted OpenAPI document. The text lives ONLY in the
  // provider's store (never in the page-context envelope), mirrored as a byte count.
  const attachOasDocument = useCallback((text: string): OasAttachmentResult => {
    const result = oasStore.set(text)
    // Mirror whatever the store now holds (a rejected over-cap paste keeps a prior hold).
    const held = oasStore.get()
    setOasHeld(held ? { bytes: held.bytes } : null)
    return result
  }, [oasStore])

  const clearOasAttachment = useCallback(() => {
    oasStore.clear()
    setOasHeld(null)
  }, [oasStore])

  const toggle = useCallback(() => setOpen((prev) => !prev), [])
  const closeTour = useCallback(() => setTourOpen(false), [])

  // Deep-link seed: a widget can start an Autopilot turn via `?ask=<prompt>` (e.g. an
  // alert's "Troubleshoot with Autopilot" button navigates here with the prompt). Open the
  // rail, send it once (guarded so a refresh doesn't re-ask), then strip the param. The
  // context collector already carries the page's telemetry, so the analysis is grounded.
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const ask = searchParams.get('ask')
    if (!ask || !enabled || askHandledRef.current) { return }
    askHandledRef.current = true
    setOpen(true)
    send(ask)
    const next = new URLSearchParams(searchParams)
    next.delete('ask')
    setSearchParams(next, { replace: true })
  }, [searchParams, enabled, send, setSearchParams])

  const value = useMemo<AutopilotContextValue>(() => ({
    approvePending, attachOasDocument, clearOasAttachment, closeTour, collect, denyPending, enabled, messages, newThread, oasAttachment: oasHeld, open, pendingApproval, send, setOpen, streaming, toggle, tour, tourOpen,
  }), [approvePending, attachOasDocument, clearOasAttachment, closeTour, collect, denyPending, enabled, messages, newThread, oasHeld, open, pendingApproval, send, streaming, toggle, tour, tourOpen])

  return (
    <AutopilotReactContext.Provider value={value}>
      <AgentDraftProvider value={{ draft: agentDraft, nonce: draftNonce }}>
        {children}
        {/* Wave-4 preview surface: the read-only preview verbs (previewBlueprint /
            previewPage / previewRestDef) render into this global drawer. */}
        <AutopilotPreviewDrawer />
      </AgentDraftProvider>
    </AutopilotReactContext.Provider>
  )
}

export const useAutopilot = (): AutopilotContextValue => {
  const context = useContext(AutopilotReactContext)
  if (!context) {
    throw new Error('useAutopilot must be used within an AutopilotProvider')
  }
  return context
}
