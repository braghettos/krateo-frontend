/**
 * Autopilot CONVERSATION STORE — a module-level (singleton) store for the durable
 * transcript + thread identity, decoupled from React component lifetime.
 *
 * WHY THIS EXISTS (the bug it fixes): the transcript used to live in
 * `AutopilotProvider`'s `useState`. The provider is mounted INSIDE the router
 * subtree (`Shell` → `AutopilotProvider`), which hangs under
 * `<RouterProvider key={routerVersion}>` (App.tsx). Any `routerVersion` bump — the
 * routes-as-data dynamic reload — remounts that whole subtree and resets every
 * `useState` to its initial value, silently WIPING the conversation (reopening the
 * rail showed the empty "Ask Autopilot" state). The page-context header survived
 * because it is re-derived from `window.location` on demand, not held in state — so
 * the rail looked "still alive" while the messages were gone.
 *
 * THE FIX: keep the durable conversation OUT of the remount-fragile subtree. This
 * singleton holds `messages` + the thread identity (`sessionId`, `contextId`); the
 * provider reads it via `useSyncExternalStore` and writes through the setters. On a
 * remount the provider re-subscribes to the SURVIVING store instead of starting from
 * an empty `[]`, so the conversation persists across a routerVersion bump — WITHOUT
 * touching the `key={routerVersion}` reload the routes-as-data flow depends on.
 *
 * SCOPE (deliberately minimal): only the DURABLE transcript + thread identity live
 * here. In-flight, per-mount streaming machinery (abort handle, per-turn text/proposal
 * buffers, approval governors) stays as component refs — an in-flight stream is torn
 * down on unmount anyway (the provider's cleanup aborts it), so it must NOT be
 * resurrected from a shared store. `newThread()` resets this store (see reset()).
 *
 * No React imports here (pure store); the provider adapts it via useSyncExternalStore.
 */

import { randomId } from '../../utils/utils'

import type { AutopilotMessage } from './types'

/** A fresh frontend-owned session id (mirrors the provider's previous `newSessionId`). */
const newSessionId = (): string => `s_${randomId()}`

/** The durable slice of Autopilot state that must survive a provider remount. */
export interface ConversationState {
  /** The conversation transcript for the current thread. */
  messages: AutopilotMessage[]
  /** Frontend-owned session id (re-issued on newThread). */
  sessionId: string
  /** A2A conversation id assigned by the server on the first turn (thread continuity). */
  contextId: string | undefined
}

export interface ConversationStore {
  /** Current immutable snapshot (stable reference until a write) — for useSyncExternalStore. */
  getSnapshot: () => ConversationState
  /** Subscribe to changes; returns an unsubscribe. */
  subscribe: (listener: () => void) => () => void
  /** Replace the transcript (value or updater), mirroring React's setState contract. */
  setMessages: (update: AutopilotMessage[] | ((prev: AutopilotMessage[]) => AutopilotMessage[])) => void
  /** Set the server-assigned A2A contextId (or clear it). */
  setContextId: (contextId: string | undefined) => void
  /** Reset to a brand-new thread: empty transcript, fresh session id, no contextId. */
  reset: () => void
}

/**
 * Create a conversation store. Snapshots are immutable and their reference is stable
 * until the next write, so `useSyncExternalStore` re-renders only on real changes.
 */
export const createConversationStore = (): ConversationStore => {
  let state: ConversationState = { contextId: undefined, messages: [], sessionId: newSessionId() }
  const listeners = new Set<() => void>()

  const emit = (): void => {
    for (const listener of listeners) {
      listener()
    }
  }

  const set = (next: ConversationState): void => {
    state = next
    emit()
  }

  return {
    getSnapshot: () => state,
    reset: () => set({ contextId: undefined, messages: [], sessionId: newSessionId() }),
    setContextId: (contextId) => {
      if (contextId === state.contextId) { return }
      set({ ...state, contextId })
    },
    setMessages: (update) => {
      const next = typeof update === 'function' ? update(state.messages) : update
      if (next === state.messages) { return }
      set({ ...state, messages: next })
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/**
 * The app-wide singleton. Lives at module scope, so it OUTLIVES any
 * AutopilotProvider remount (that is the whole point). One rail per app → one store.
 */
export const autopilotConversationStore = createConversationStore()
