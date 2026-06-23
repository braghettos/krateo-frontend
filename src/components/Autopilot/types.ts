/**
 * Krateo Autopilot — frontend integration types.
 *
 * Phase 1 (read-only Q&A MVP). The GOVERNING INVARIANT for the whole feature:
 * Autopilot never mutates directly — it acts ONLY by operating the real Krateo
 * frontend (navigate-then-drive the actual Form/Button/row-action via the existing
 * dispatcher). The portal's UI controls ARE the entire action surface. These types
 * model the read-only side (transcript + context grounding + transport) plus the
 * forward-declared action/proposal shapes the bridge will use in Phase 2/3, so the
 * transcript and frame handler are ready without a later type churn.
 */

/** Who authored a transcript message. */
export type AutopilotRole = 'user' | 'assistant'

/**
 * A single transcript message. `streaming` marks an assistant bubble still being
 * filled by the A2A stream. `actions`/`intent`/`confirm` are Phase-2/3 surfaces
 * (read-only action chips, "about to:" preview, HITL confirm) — optional here so
 * the transcript renderer is forward-compatible.
 */
export interface AutopilotMessage {
  id: string
  role: AutopilotRole
  text: string
  streaming?: boolean
  /** Auto-applied read-only action chips (Phase 2). */
  actions?: AutopilotActionChip[]
  /** Context-derived quick-prompts surfaced under an assistant turn (Phase 2). */
  suggestions?: string[]
  createdAt: number
}

/** A read-only action chip rendered after it was auto-applied (component 7). */
export interface AutopilotActionChip {
  /** The executed verb (navigate / openDrawer / openModal / setExtras). */
  verb: string
  /** Human-readable target (e.g. "alb-ingress-prod · 1 / 3 resources Ready"). */
  label: string
  /** Marks the chip as non-mutating / auto-applied. Always true for Phase 2. */
  readOnly: boolean
}

// ────────────────────────────────────────────────────────────────────────────
// Context grounding (component 2) — what Autopilot is allowed to SEE.
// Built by the collector, scrubbed by the redactor (LAST), fenced as data.
// ────────────────────────────────────────────────────────────────────────────

/**
 * One on-screen widget, reconstructed from the live `['widgets', endpoint, extras]`
 * react-query cache — NOT model memory. Carries id/kind/title and a compact,
 * redaction-safe `summary`; never the raw resourceRef payload (the redactor drops
 * payloads entirely).
 */
export interface WidgetInventoryEntry {
  endpoint: string
  kind?: string
  name?: string
  title?: string
  /** A short, kind-aware summary (e.g. "Table · 248 rows"). */
  summary?: string
  /** For a Form widget: its top-level field names, so Autopilot can prefill them. */
  fields?: string[]
  /** For an action-bearing widget (e.g. Button): the runnable actions on it, so
   * Autopilot can drive the REAL control (gated). `verb` GET = read-only. */
  actions?: { id: string; label?: string; verb: string }[]
}

/** The whoami identity surfaced to ground greetings (no token, ever). */
export interface AutopilotIdentity {
  username?: string
  displayName?: string
}

/**
 * The page-context envelope. Serialized inside a `<page_context>` fence and sent
 * with every turn (full on turn 1, delta thereafter). Every field is observed
 * screen state, never an instruction.
 */
export interface PageContextEnvelope {
  /** Current route pathname. */
  route: string
  /** Whitelisted URL params describing the current scope (status / range / q). */
  extras?: Record<string, string>
  identity?: AutopilotIdentity
  /** The live on-screen widget inventory. */
  widgets: WidgetInventoryEntry[]
  /** A one-line kind-aware summary of the focused surface. */
  focus?: string
}

// ────────────────────────────────────────────────────────────────────────────
// Transport (components 4 & 5) — A2A stream to the kagent orchestrator.
// Phase-0 spike confirms the concrete wire format; this is the stable seam.
// ────────────────────────────────────────────────────────────────────────────

/** A request for one conversational turn. */
export interface AutopilotSendRequest {
  /** Frontend-owned session/thread id (created on new-thread; used by the echo stub). */
  sessionId: string
  /** A2A conversation continuity id, assigned by the server on the first turn and
   * echoed back on follow-ups. Undefined on the first turn of a thread. */
  contextId?: string
  /** The user's prompt text. */
  text: string
  /** The redacted, fenced page-context string (full or delta). */
  context: string
  /** True only for the first turn of a session (full context, greeting hint). */
  firstTurn: boolean
}

/**
 * A normalized stream frame. The concrete transport translates kagent/ADK A2A
 * frames into these. Phase 1 only renders `text`; `tool_call` / `require_approval`
 * are forward-declared for the Phase-2/3 action bridge interception.
 */
export type AutopilotFrame =
  // `replace` true → set the bubble to `delta` (an authoritative full text, e.g. a
  // kagent final message); otherwise append `delta` (a streamed chunk).
  | { kind: 'text'; delta: string; replace?: boolean }
  // A2A conversation id, surfaced so the provider can continue the thread.
  | { kind: 'session'; contextId: string }
  | { kind: 'tool_call'; name: string; args: unknown }
  | { kind: 'require_approval'; id: string; summary: string }
  | { kind: 'done' }
  | { kind: 'error'; message: string }

/** Per-stream callbacks. The transport invokes these as frames arrive. */
export interface AutopilotStreamHandlers {
  onFrame: (frame: AutopilotFrame) => void
}

/**
 * The transport seam. A concrete `KagentA2ATransport` targets the deployed
 * orchestrator's A2A endpoint (carrying the portal Bearer); an `EchoTransport`
 * backs local development before the live handshake is wired. `send` returns an
 * abort function that cancels the in-flight stream.
 */
export interface AutopilotTransport {
  send: (request: AutopilotSendRequest, handlers: AutopilotStreamHandlers) => () => void
}
