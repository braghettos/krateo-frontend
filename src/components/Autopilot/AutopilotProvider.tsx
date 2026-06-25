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

import { useConfigContext } from '../../context/ConfigContext'
import { randomId } from '../../utils/utils'

import type { PortalActionProposal, PortalTour } from './actionBridge'
import { PORTAL_CAPABILITIES_PROMPT, parseAutopilotDirectives, useAutopilotActionBridge } from './actionBridge'
import { AgentDraftProvider } from './agentDraft'
import { createEchoTransport, createKagentTransport } from './transport'
import type { AutopilotActionChip, AutopilotFrame, AutopilotMessage, AutopilotTransport, PageContextEnvelope } from './types'
import { buildContextDelta, useAutopilotContext } from './useAutopilotContext'

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
  /** Snapshot the live page context (for the rail's context strip). */
  collect: () => PageContextEnvelope
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

  const abortRef = useRef<(() => void) | null>(null)
  const sentFirstRef = useRef(false)
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

  const transport: AutopilotTransport = useMemo(
    () => (endpoint && endpoint !== 'echo' ? createKagentTransport(endpoint) : createEchoTransport()),
    [endpoint],
  )

  // Abort any in-flight stream when the provider unmounts.
  useEffect(() => () => abortRef.current?.(), [])

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

    // Start a guided spotlight tour if one was proposed.
    if (proposedTour) {
      setTour(proposedTour)
      setTourOpen(true)
    }

    const chips: AutopilotActionChip[] = []
    for (const proposal of [...toolProposals, ...textProposals]) {
      // prefillForm is handled here (it sets provider state, not a dispatcher action):
      // merge the values into the mounted Form's initialValues; the user still reviews +
      // submits via the form's own gate. No cluster mutation — Autopilot never submits.
      if (proposal.verb === 'prefillForm') {
        setAgentDraft(proposal.values ?? {})
        setDraftNonce((nonce) => nonce + 1)
        chips.push({ label: proposal.label ?? 'drafted the create form', readOnly: true, verb: 'prefillForm' })
        continue
      }
      // eslint-disable-next-line no-await-in-loop -- sequential: a navigate changes the page the next action sees
      const chip = await apply(proposal)
      if (chip) {
        chips.push(chip)
      }
    }
    if (chips.length) {
      setMessages((prev) => prev.map((message) => (
        message.id === assistantId ? { ...message, actions: chips } : message
      )))
    }
  }, [apply])

  const applyFrame = useCallback((assistantId: string, frame: AutopilotFrame) => {
    switch (frame.kind) {
      case 'text': {
        const current = assistantTextRef.current.get(assistantId) ?? ''
        const next = frame.replace ? frame.delta : current + frame.delta
        assistantTextRef.current.set(assistantId, next)
        setMessages((prev) => prev.map((message) => (
          message.id === assistantId ? { ...message, text: next } : message
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
      case 'require_approval':
        // Phase 3: HITL-gated mutations. Read-only phases ignore it.
        break
      default:
        break
    }
  }, [finalize])

  const send = useCallback((text: string) => {
    const trimmed = text.trim()
    if (!trimmed || streaming) {
      return
    }

    const envelope = collect()
    const firstTurn = !sentFirstRef.current
    sentFirstRef.current = true
    const baseContext = buildContextDelta(envelope, lastEnvelopeRef.current)
    lastEnvelopeRef.current = envelope
    // Teach the orchestrator the read-only proposal protocol once per thread
    // (outside the page_context data-fence; it remembers via the A2A contextId).
    const contextString = firstTurn ? `${PORTAL_CAPABILITIES_PROMPT}\n\n${baseContext}` : baseContext

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
  }, [])

  const toggle = useCallback(() => setOpen((prev) => !prev), [])
  const closeTour = useCallback(() => setTourOpen(false), [])

  const value = useMemo<AutopilotContextValue>(() => ({
    closeTour, collect, enabled, messages, newThread, open, send, setOpen, streaming, toggle, tour, tourOpen,
  }), [closeTour, collect, enabled, messages, newThread, open, send, streaming, toggle, tour, tourOpen])

  return (
    <AutopilotReactContext.Provider value={value}>
      <AgentDraftProvider value={{ draft: agentDraft, nonce: draftNonce }}>
        {children}
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
