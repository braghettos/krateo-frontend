/**
 * W0-1 — Wave-4 preview verb handlers. Pure-logic coverage (no RTL/jsdom).
 *   - previewBlueprint builds `/blueprints/<ns>/<name>/new`, validates it against the
 *     real route patterns, dispatches a navigate, and does NOT prefill (no agentDraft);
 *   - previewPage reuses the SAME route-pattern validation as navigate and drops a
 *     hallucinated route (matchPath null → null, handleAction uncalled).
 */
import { describe, expect, it, vi } from 'vitest'

import type { WidgetAction } from '../../types/Widget'

import { previewBlueprintSpec, previewPageSpec } from './previewHandlers'
import type { VerbDeps } from './verbRegistry'

// The blueprint Configure route pattern (param route) + the compositions detail pattern,
// so previewPage validation has a real table to match/miss against.
const PATTERNS = ['/blueprints/:namespace/:name/new', '/compositions/:namespace/:name']

const makeDeps = (
  routePatterns: string[] = PATTERNS,
): { deps: VerbDeps; handleAction: ReturnType<typeof vi.fn> } => {
  const handleAction = vi.fn((): Promise<void> => Promise.resolve())
  return { deps: { handleAction, routePatterns }, handleAction }
}

/** First arg (the WidgetAction) of the first handleAction call. */
const firstAction = (handleAction: ReturnType<typeof vi.fn>): WidgetAction =>
  handleAction.mock.calls[0][0] as WidgetAction

describe('previewBlueprint', () => {
  it('is a read verb', () => {
    expect(previewBlueprintSpec.sideEffect).toBe('read')
    expect(previewBlueprintSpec.name).toBe('previewBlueprint')
  })

  it('builds /blueprints/<ns>/<name>/new and dispatches a validated navigate (no prefill)', async () => {
    const { deps, handleAction } = makeDeps()
    const chip = await previewBlueprintSpec.apply(
      { name: 'aws-vpc', namespace: 'krateo-system', verb: 'previewBlueprint' },
      deps,
    )
    expect(handleAction).toHaveBeenCalledTimes(1)
    const action = firstAction(handleAction)
    expect(action).toEqual({ id: 'autopilot-preview-blueprint', path: '/blueprints/krateo-system/aws-vpc/new', type: 'navigate' })
    // read-only chip, and NO values/prefill payload of any kind was dispatched.
    expect(chip).toEqual({ label: 'preview aws-vpc', readOnly: true, verb: 'previewBlueprint' })
    expect(action).not.toHaveProperty('values')
  })

  it('accepts the `ns` alias for namespace', async () => {
    const { deps, handleAction } = makeDeps()
    await previewBlueprintSpec.apply({ name: 'postgres', ns: 'demo-system', verb: 'previewBlueprint' }, deps)
    expect(firstAction(handleAction)).toMatchObject({ path: '/blueprints/demo-system/postgres/new' })
  })

  it('argSchema rejects a proposal missing ns/name (returns null, no dispatch)', async () => {
    const { deps, handleAction } = makeDeps()
    expect(previewBlueprintSpec.argSchema({ name: 'aws-vpc', verb: 'previewBlueprint' })).toBe(false)
    const chip = await previewBlueprintSpec.apply({ name: 'aws-vpc', verb: 'previewBlueprint' }, deps)
    expect(chip).toBeNull()
    expect(handleAction).not.toHaveBeenCalled()
  })
})

describe('previewPage', () => {
  it('is a read verb', () => {
    expect(previewPageSpec.sideEffect).toBe('read')
  })

  it('dispatches a validated navigate for a real route', async () => {
    const { deps, handleAction } = makeDeps()
    const chip = await previewPageSpec.apply({ route: '/compositions/krateo-system/portal', verb: 'previewPage' }, deps)
    expect(handleAction).toHaveBeenCalledTimes(1)
    expect(firstAction(handleAction)).toEqual({ id: 'autopilot-preview-page', path: '/compositions/krateo-system/portal', type: 'navigate' })
    expect(chip?.readOnly).toBe(true)
    expect(chip?.verb).toBe('previewPage')
  })

  it('drops a hallucinated route that matches no registered pattern (matchPath null → null)', async () => {
    const { deps, handleAction } = makeDeps()
    const chip = await previewPageSpec.apply({ route: '/admin/secret-console', verb: 'previewPage' }, deps)
    expect(chip).toBeNull()
    expect(handleAction).not.toHaveBeenCalled()
  })

  it('fails open when the route table has not registered yet (empty patterns)', async () => {
    const { deps, handleAction } = makeDeps([])
    await previewPageSpec.apply({ route: '/anything', verb: 'previewPage' }, deps)
    expect(handleAction).toHaveBeenCalledTimes(1)
  })
})
