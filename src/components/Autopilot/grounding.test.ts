/**
 * Autopilot grounding / anti-confabulation coverage.
 *
 * SCOPE: pure-logic only (like the repo's other tests — no RTL / jsdom). We assert:
 *   1. The grounding guardrail prompt exists and forbids the specific confabulation
 *      that hit a colleague: attributing a "page not loading" problem to an unrelated
 *      crashlooping pod. This is the frontend defense-in-depth regardless of backend.
 *   2. It is wired to ride on EVERY turn (not first-turn-only) — the decay fix. We
 *      reproduce the provider's preamble-assembly rule here (the exact expression the
 *      provider uses) and prove the guardrail is present on both the first and a
 *      follow-up turn.
 *   3. The collector derives a TRUTHFUL page status from the live widget load states
 *      (heavy / error / loading / ready), so Autopilot can give the RIGHT answer
 *      ("the compositions table is very large and still rendering") instead of guessing.
 *   4. The context delta re-sends whenever the page status flips, so grounding does
 *      not go stale mid-conversation.
 */
import { describe, expect, it } from 'vitest'

import { GROUNDING_GUARDRAIL_PROMPT, PORTAL_CAPABILITIES_PROMPT } from './actionBridge'
import type { PageContextEnvelope, WidgetInventoryEntry } from './types'
import { buildContextDelta, derivePageStatus, loadStateFromStatus, serializePageContext } from './useAutopilotContext'

const widget = (over: Partial<WidgetInventoryEntry> = {}): WidgetInventoryEntry => ({
  endpoint: '/call?resource=flexes&name=x',
  kind: 'Panel',
  ...over,
})

const envelope = (over: Partial<PageContextEnvelope> = {}): PageContextEnvelope => ({
  route: '/compositions',
  widgets: [],
  ...over,
})

/** The provider's every-turn preamble rule, kept in lockstep with AutopilotProvider.send(). */
const buildPreamble = (firstTurn: boolean, baseContext: string): string =>
  (firstTurn
    ? `${GROUNDING_GUARDRAIL_PROMPT}\n\n${PORTAL_CAPABILITIES_PROMPT}\n\n${baseContext}`
    : `${GROUNDING_GUARDRAIL_PROMPT}\n\n${baseContext}`)

describe('Autopilot grounding guardrail', () => {
  it('forbids attributing page-load/render problems to unrelated cluster workloads', () => {
    const lowered = GROUNDING_GUARDRAIL_PROMPT.toLowerCase()
    // Names the confabulation class explicitly …
    expect(lowered).toContain('crashloopbackoff')
    // … and the render/load concern it must not be linked to.
    expect(lowered).toMatch(/page.*(not )?load|render|responsiveness/)
    // Must instruct MUST NOT attributing one to the other.
    expect(lowered).toContain('must not')
  })

  it('tells the model to admit ignorance + point at where to look when no cause is grounded', () => {
    const lowered = GROUNDING_GUARDRAIL_PROMPT.toLowerCase()
    // Admit-ignorance escape hatch (no confabulation) …
    expect(lowered).toMatch(/cannot see|don't have enough|do not have enough/)
    // … and the truthful places to look instead of guessing.
    expect(lowered).toContain('console')
    expect(lowered).toMatch(/dataset|row count|large/)
  })

  it('is asserted on EVERY turn (first AND follow-up), not just the first — decay fix', () => {
    const first = buildPreamble(true, '<page_context>…</page_context>')
    const followUp = buildPreamble(false, '<page_context>…</page_context>')
    expect(first).toContain(GROUNDING_GUARDRAIL_PROMPT)
    expect(followUp).toContain(GROUNDING_GUARDRAIL_PROMPT)
    // The capabilities protocol is taught once (first turn only); the guardrail persists.
    expect(first).toContain(PORTAL_CAPABILITIES_PROMPT)
    expect(followUp).not.toContain(PORTAL_CAPABILITIES_PROMPT)
  })
})

describe('collector page-status grounding', () => {
  it('maps react-query state → truthful on-screen load state', () => {
    expect(loadStateFromStatus('pending', 'fetching')).toBe('loading')
    // A success-status widget that is background-refetching still counts as loading.
    expect(loadStateFromStatus('success', 'fetching')).toBe('loading')
    expect(loadStateFromStatus('error', 'idle')).toBe('error')
    expect(loadStateFromStatus('success', 'idle')).toBe('ready')
  })

  it('derives an errored page status when any widget failed to load', () => {
    expect(derivePageStatus([widget({ loadState: 'ready' }), widget({ loadState: 'error' })])).toBe('error')
  })

  it('flags a very large dataset as "heavy" (the compositions-table render hazard)', () => {
    // The grounded RIGHT answer for the reported bug: a huge non-virtualized table.
    expect(derivePageStatus([widget({ kind: 'Table', large: true, loadState: 'ready', summary: 'Table · 60026 rows' })]))
      .toBe('heavy')
  })

  it('prefers loading/error over heavy, and returns undefined with no widgets (unknown ≠ fabricated)', () => {
    expect(derivePageStatus([widget({ large: true, loadState: 'loading' })])).toBe('loading')
    expect(derivePageStatus([])).toBeUndefined()
  })
})

describe('context delta keeps page status fresh', () => {
  const base = envelope({ pageStatus: 'loading', widgets: [widget({ endpoint: '/a', loadState: 'loading' })] })

  it('re-sends the full envelope when pageStatus flips even if route + widgets are unchanged', () => {
    const next = envelope({ pageStatus: 'ready', widgets: [widget({ endpoint: '/a', loadState: 'ready' })] })
    const delta = buildContextDelta(next, base)
    // A full re-send (not the short "Unchanged" note) — the render state changed.
    expect(delta).toBe(serializePageContext(next))
    expect(delta).not.toContain('Unchanged:')
  })

  it('sends only the short note (carrying pageStatus) when nothing render-relevant changed', () => {
    const next = envelope({ pageStatus: 'loading', widgets: [widget({ endpoint: '/a', loadState: 'loading' })] })
    const delta = buildContextDelta(next, base)
    expect(delta).toContain('Unchanged:')
    expect(delta).toContain('page loading')
  })
})
