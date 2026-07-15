import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'

import { createBlueprintGate } from './blueprintGate'
import { isPageDraft, pageDisplayName, pageDraftFiles, pageDraftSlug } from './pageDraft'

const flexRoot = { apiVersion: 'widgets.templates.krateo.io/v1beta1', kind: 'Flex', metadata: { name: 'page-postgres', namespace: 'krateo-system' }, spec: { widgetData: { items: [] } } }
const card = { apiVersion: 'widgets.templates.krateo.io/v1beta1', kind: 'Card', metadata: { name: 'pg-summary', namespace: 'krateo-system' }, spec: { widgetData: { title: 'Postgres' } } }

describe('pageDraftSlug', () => {
  it('is <kind-lower>.<name>.yaml', () => {
    expect(pageDraftSlug('Flex', 'page-postgres')).toBe('flex.page-postgres.yaml')
    expect(pageDraftSlug('Card', 'pg-summary')).toBe('card.pg-summary.yaml')
  })
})

describe('pageDraftFiles', () => {
  it('serializes each CR to YAML keyed by slug (round-trips)', () => {
    const files = pageDraftFiles([flexRoot, card])
    expect(files).not.toBeNull()
    expect(Object.keys(files!).sort()).toEqual(['card.pg-summary.yaml', 'flex.page-postgres.yaml'])
    // The held YAML is the verbatim CR — it must load back to the same object (published == previewed).
    expect(load(files!['flex.page-postgres.yaml'])).toEqual(flexRoot)
    expect(load(files!['card.pg-summary.yaml'])).toEqual(card)
  })

  it('refuses (null) an empty list, a non-object entry, or a CR missing kind/name', () => {
    expect(pageDraftFiles([])).toBeNull()
    expect(pageDraftFiles(['nope'])).toBeNull()
    expect(pageDraftFiles([{ kind: 'Card' }])).toBeNull()
    expect(pageDraftFiles([{ metadata: { name: 'x' } }])).toBeNull()
    expect(pageDraftFiles([{ kind: '  ', metadata: { name: 'x' } }])).toBeNull()
  })
})

describe('isPageDraft', () => {
  it('is true for a page draft (no Chart.yaml) and false for a blueprint draft', () => {
    expect(isPageDraft({ 'card.y.yaml': '...', 'flex.page-x.yaml': '...' })).toBe(true)
    expect(isPageDraft({ 'Chart.yaml': 'name: x', 'values.yaml': '...' })).toBe(false)
  })
})

describe('pageDisplayName', () => {
  it('is the page-root flex slug, stable across recompute', () => {
    const files = pageDraftFiles([card, flexRoot])!
    expect(pageDisplayName(files)).toBe('page:flex.page-postgres')
    // Stable: same files → same identity (record-time == publish-time).
    expect(pageDisplayName(pageDraftFiles([flexRoot, card])!)).toBe('page:flex.page-postgres')
  })

  it('falls back to the first slug when there is no page-root flex', () => {
    expect(pageDisplayName({ 'card.a.yaml': '...', 'table.b.yaml': '...' })).toBe('page:card.a')
  })
})

// The safety invariant: a page publish (RepoContent/GitRef/PullRequest ops) is DENIED by the
// SHARED blueprint gate unless the SAME page was previewed this thread — identical to the
// blueprint invariant, so FE-P2 does not weaken the mutation-safety boundary.
describe('page publish gate (safety)', () => {
  const pagePublishOps = [
    { gvr: { group: 'github.krateo.io', resource: 'gitrefs', version: 'v1alpha1' }, verb: 'POST' as const },
    { gvr: { group: 'github.krateo.io', resource: 'repocontents', version: 'v1alpha1' }, verb: 'POST' as const },
    { gvr: { group: 'github.krateo.io', resource: 'pullrequests', version: 'v1alpha1' }, verb: 'POST' as const },
  ]

  it('DENIES a page publish that was never previewed', () => {
    const gate = createBlueprintGate()
    const files = pageDraftFiles([flexRoot, card])!
    expect(gate.evaluate(pagePublishOps, pageDisplayName(files)).allowed).toBe(false)
  })

  it('ALLOWS the page publish only after the SAME page was previewed', () => {
    const gate = createBlueprintGate()
    const files = pageDraftFiles([flexRoot, card])!
    // recordPreview mirrors the provider's previewPage branch (recordPagePreview)
    gate.recordPreview(pageDisplayName(files))
    expect(gate.evaluate(pagePublishOps, pageDisplayName(files)).allowed).toBe(true)
  })

  it('still DENIES after reset (newThread forgets the preview)', () => {
    const gate = createBlueprintGate()
    const files = pageDraftFiles([flexRoot, card])!
    gate.recordPreview(pageDisplayName(files))
    gate.reset()
    expect(gate.evaluate(pagePublishOps, pageDisplayName(files)).allowed).toBe(false)
  })

  it('does not allow a DIFFERENT page than the one previewed', () => {
    const gate = createBlueprintGate()
    // previewed page-postgres, then attempt to publish page-redis
    gate.recordPreview(pageDisplayName(pageDraftFiles([flexRoot])!))
    const otherRoot = { ...flexRoot, metadata: { name: 'page-redis', namespace: 'krateo-system' } }
    const otherName = pageDisplayName(pageDraftFiles([otherRoot])!)
    expect(gate.evaluate(pagePublishOps, otherName).allowed).toBe(false)
  })
})
