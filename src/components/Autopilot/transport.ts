/**
 * Transport (components 4 & 5). Two implementations behind the `AutopilotTransport`
 * seam:
 *
 *   - `createKagentTransport(baseUrl)` — POSTs a turn to the deployed kagent
 *     orchestrator's A2A endpoint, carrying the user's portal Bearer (NEVER an LLM
 *     key in the browser), and streams the reply. The exact wire shape is the
 *     Phase-0 LIVE spike (ingress/CORS/Bearer + frame types must be confirmed
 *     against the running kagent with an authenticated session); the SSE parser
 *     here is deliberately defensive across the plausible ADK/A2A shapes so the
 *     spike is a small tweak, not a rewrite. Marked TODO where it must be verified.
 *
 *   - `createEchoTransport()` — a local stub that streams a canned reply so the
 *     rail is exercisable before the live handshake is wired. Clearly labelled in
 *     its output so it is never mistaken for a real answer.
 *
 * GOVERNING INVARIANT: the transport is read-only plumbing. It carries text and
 * (later) `propose_portal_action` tool_call frames the bridge intercepts — it never
 * itself mutates the cluster.
 */

import type { AutopilotSendRequest, AutopilotStreamHandlers, AutopilotTransport } from './types'

// ────────────────────────────────────────────────────────────────────────────
// kagent A2A transport
// ────────────────────────────────────────────────────────────────────────────

/**
 * The kagent A2A endpoint. `baseUrl` is the FULL agent A2A URL exposed by the
 * kagent-ui LoadBalancer, e.g.
 *   http://<kagent-ui>/api/a2a/<namespace>/<agent-name>
 * We POST a JSON-RPC `message/stream` to it (trailing slash). Verified live against
 * kagent (A2A protocol 0.3): the API is open (no Bearer) + reflects CORS for the
 * portal origin, and streams SSE of `status-update` results.
 */
const buildA2aUrl = (baseUrl: string): string => `${baseUrl.replace(/\/$/, '')}/`

/**
 * JSON-RPC `message/stream` body. The redacted page-context fence rides ahead of
 * the user text inside the message. `contextId` continues an existing A2A thread
 * (omitted on the first turn → the server assigns one, surfaced back as a `session`
 * frame). A fresh `messageId` per turn.
 */
const buildRequestBody = (request: AutopilotSendRequest): string => {
  const message: Record<string, unknown> = {
    kind: 'message',
    messageId: crypto.randomUUID(),
    parts: [{ kind: 'text', text: `${request.context}\n\n${request.text}` }],
    role: 'user',
  }
  if (request.contextId) {
    message.contextId = request.contextId
  }
  return JSON.stringify({ id: 1, jsonrpc: '2.0', method: 'message/stream', params: { message } })
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  (value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined)

/** Per-stream state carried across SSE events (so `session` fires once). */
interface KagentStreamState {
  contextSent: boolean
}

/**
 * Translate one A2A JSON-RPC payload into 0..n normalized frames:
 *   - `result.contextId` → a one-time `session` frame (thread continuity)
 *   - `status.message` with `role: 'agent'` → text: `kagent_adk_partial: true`
 *     appends a streamed chunk; `false` REPLACES with the authoritative full text;
 *     `functionCall` parts surface as `tool_call` (intercepted in Phase 2)
 *   - `result.final === true` / state `completed` → `done`
 *   - a top-level JSON-RPC `error` → `error`
 * User-role echoes and status-only updates produce nothing.
 */
const handleKagentPayload = (
  payload: unknown,
  handlers: AutopilotStreamHandlers,
  state: KagentStreamState,
): void => {
  const root = asRecord(payload)
  if (!root) {
    return
  }
  const rpcError = asRecord(root.error)
  if (rpcError && typeof rpcError.message === 'string') {
    handlers.onFrame({ kind: 'error', message: rpcError.message })
    return
  }
  const result = asRecord(root.result)
  if (!result) {
    return
  }

  if (!state.contextSent && typeof result.contextId === 'string') {
    state.contextSent = true
    handlers.onFrame({ contextId: result.contextId, kind: 'session' })
  }

  const status = asRecord(result.status)
  const message = asRecord(status?.message)
  if (message && message.role === 'agent' && Array.isArray(message.parts)) {
    let text = ''
    for (const part of message.parts) {
      const partRecord = asRecord(part)
      const functionCall = asRecord(partRecord?.functionCall)
      if (functionCall && typeof functionCall.name === 'string') {
        handlers.onFrame({ args: functionCall.args, kind: 'tool_call', name: functionCall.name })
      } else if (typeof partRecord?.text === 'string') {
        text += partRecord.text
      }
    }
    if (text) {
      const partial = asRecord(message.metadata)?.kagent_adk_partial
      handlers.onFrame({ delta: text, kind: 'text', replace: partial === false })
    }
  }

  if (result.final === true || status?.state === 'completed') {
    handlers.onFrame({ kind: 'done' })
  }
}

/** Pull complete SSE events out of a rolling buffer, returning [events, remainder]. */
const drainSseEvents = (buffer: string): { events: string[]; rest: string } => {
  const events: string[] = []
  let rest = buffer
  let boundary = rest.indexOf('\n\n')
  while (boundary !== -1) {
    events.push(rest.slice(0, boundary))
    rest = rest.slice(boundary + 2)
    boundary = rest.indexOf('\n\n')
  }
  return { events, rest }
}

/** Extract the JSON string from an SSE event block's `data:` lines. */
const dataFromEvent = (event: string): string | null => {
  const lines = event.split('\n')
  const dataLines = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
  if (!dataLines.length) {
    return null
  }
  return dataLines.join('\n')
}

/** Parse one SSE event block and forward its frames. */
const processSseEvent = (event: string, handlers: AutopilotStreamHandlers, state: KagentStreamState): void => {
  const data = dataFromEvent(event)
  if (!data || data === '[DONE]') {
    return
  }
  try {
    handleKagentPayload(JSON.parse(data), handlers, state)
  } catch {
    // Non-JSON keepalive/comment line — ignore.
  }
}

export const createKagentTransport = (baseUrl: string): AutopilotTransport => ({
  send: (request: AutopilotSendRequest, handlers: AutopilotStreamHandlers): (() => void) => {
    const controller = new AbortController()
    const state: KagentStreamState = { contextSent: false }

    const run = async (): Promise<void> => {
      let response: Response
      try {
        response = await fetch(buildA2aUrl(baseUrl), {
          // kagent-ui A2A is open (no Bearer) and reflects CORS for the portal
          // origin. Act-as-user auth is a Phase-3 concern (pending kagent auth).
          body: buildRequestBody(request),
          headers: {
            Accept: 'text/event-stream',
            'Content-Type': 'application/json',
          },
          method: 'POST',
          signal: controller.signal,
        })
      } catch (error) {
        handlers.onFrame({ kind: 'error', message: error instanceof Error ? error.message : 'network error' })
        return
      }

      if (!response.ok || !response.body) {
        handlers.onFrame({ kind: 'error', message: `Autopilot request failed (${response.status})` })
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      try {
        for (;;) {
          // eslint-disable-next-line no-await-in-loop -- sequential stream reads are inherent to SSE
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          buffer += decoder.decode(value, { stream: true })
          const { events, rest } = drainSseEvents(buffer)
          buffer = rest
          events.forEach((event) => processSseEvent(event, handlers, state))
        }
        handlers.onFrame({ kind: 'done' })
      } catch (error) {
        if (!controller.signal.aborted) {
          handlers.onFrame({ kind: 'error', message: error instanceof Error ? error.message : 'stream error' })
        }
      }
    }

    void run()
    return () => controller.abort()
  },
})

// ────────────────────────────────────────────────────────────────────────────
// Local echo transport (dev stub, no backend)
// ────────────────────────────────────────────────────────────────────────────

// The dev stub also demonstrates the Phase-2 driving channel: it emits a fenced
// `portal-action` block, which the bridge strips from the text and auto-applies
// (navigates) — exactly how the real orchestrator will propose once prompted.
const ECHO_REPLY = [
  'Local echo (no live backend) — opening the portal composition to show the driving bridge.',
  '',
  '```portal-action',
  '{"verb":"navigate","route":"/compositions/krateo-system/portal","label":"open portal composition"}',
  '```',
].join('\n')

const ECHO_CHUNK = 6

export const createEchoTransport = (): AutopilotTransport => ({
  send: (_request: AutopilotSendRequest, handlers: AutopilotStreamHandlers): (() => void) => {
    const chunks = Math.ceil(ECHO_REPLY.length / ECHO_CHUNK)
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let index = 0

    // Recursive scheduler (not a loop) so the closure is declared once; chunks by
    // characters (not words) so newlines in the fenced block survive.
    const step = (): void => {
      if (cancelled) {
        return
      }
      handlers.onFrame({ delta: ECHO_REPLY.slice(index * ECHO_CHUNK, (index + 1) * ECHO_CHUNK), kind: 'text' })
      index += 1
      if (index < chunks) {
        timer = setTimeout(step, 25)
      } else {
        handlers.onFrame({ kind: 'done' })
      }
    }
    timer = setTimeout(step, 25)

    return () => {
      cancelled = true
      if (timer) {
        clearTimeout(timer)
      }
    }
  },
})
