/**
 * W0-1 — deny-by-default read-only verb registry. Pure-logic coverage (no RTL/jsdom),
 * matching the repo's other Autopilot tests. Proves the registry IS the deny gate:
 *   - an unknown verb resolves to no spec (denied by the bridge);
 *   - a sideEffect:'write' entry is rejected exactly like an unknown verb;
 *   - each seeded read verb resolves and dispatches through the injected handler.
 */
import { describe, expect, it, vi } from 'vitest'

import type { PortalActionProposal } from './actionBridge'
// Import the preview handlers for their side effect (they register previewBlueprint /
// previewPage into the registry on load), matching what actionBridge.ts does.
import './previewHandlers'
import {
  isReadOnlyVerb,
  READONLY_VERB_REGISTRY,
  registerReadOnlyVerb,
  type VerbDeps,
  type VerbSpec,
} from './verbRegistry'

const makeDeps = (): { deps: VerbDeps; handleAction: ReturnType<typeof vi.fn> } => {
  const handleAction = vi.fn((): Promise<void> => Promise.resolve())
  return { deps: { handleAction, routePatterns: [] }, handleAction }
}

describe('READONLY_VERB_REGISTRY — seeded read verbs', () => {
  it('seeds the four original read-only verbs + the three preview verbs, all sideEffect:read', () => {
    for (const verb of ['navigate', 'setExtras', 'openDrawer', 'openModal', 'previewBlueprint', 'previewPage', 'previewRestDef']) {
      expect(READONLY_VERB_REGISTRY[verb]).toBeDefined()
      expect(READONLY_VERB_REGISTRY[verb].sideEffect).toBe('read')
      expect(isReadOnlyVerb(verb)).toBe(true)
    }
  })

  it('navigate resolves + dispatches when the route validates (empty patterns fail open)', async () => {
    const { deps, handleAction } = makeDeps()
    const chip = await READONLY_VERB_REGISTRY.navigate.apply({ route: '/blueprints', verb: 'navigate' }, deps)
    expect(handleAction).toHaveBeenCalledTimes(1)
    expect(chip).toEqual({ label: 'open /blueprints', readOnly: true, verb: 'navigate' })
  })

  it('setExtras resolves + builds a same-path whitelisted-extras navigate', async () => {
    vi.stubGlobal('window', { location: { pathname: '/compositions' } })
    const { deps, handleAction } = makeDeps()
    const chip = await READONLY_VERB_REGISTRY.setExtras.apply(
      { extras: { status: 'error' }, verb: 'setExtras' },
      deps,
    )
    expect(handleAction).toHaveBeenCalledTimes(1)
    expect(chip?.readOnly).toBe(true)
    expect(chip?.verb).toBe('setExtras')
    vi.unstubAllGlobals()
  })
})

describe('deny-by-default — the registry IS the gate', () => {
  it('an unknown verb has no spec (denied at the bridge)', () => {
    const unknown = 'deleteEverything'
    expect(READONLY_VERB_REGISTRY[unknown]).toBeUndefined()
    expect(isReadOnlyVerb(unknown)).toBe(false)
  })

  it('a sideEffect:write entry is NOT a read verb, so isReadOnlyVerb rejects it like an unknown', () => {
    const writeSpec: VerbSpec = {
      apply: () => Promise.resolve({ label: 'should never run', readOnly: false, verb: 'destroyCluster' }),
      argSchema: () => true,
      name: 'destroyCluster',
      sideEffect: 'write',
    }
    registerReadOnlyVerb(writeSpec)
    // Registered, but a WRITE verb: the read-only predicate denies it exactly like an
    // unknown verb — proving a write verb cannot join the read-only path by accident.
    expect(READONLY_VERB_REGISTRY.destroyCluster).toBeDefined()
    expect(isReadOnlyVerb('destroyCluster')).toBe(false)
    // clean up so we don't leak the write verb into other test files' shared module state
    delete READONLY_VERB_REGISTRY.destroyCluster
  })

  it('argSchema rejects a shape-mismatched read proposal (navigate with no route)', () => {
    const proposal = { verb: 'navigate' } as PortalActionProposal
    expect(READONLY_VERB_REGISTRY.navigate.argSchema(proposal)).toBe(false)
  })
})
