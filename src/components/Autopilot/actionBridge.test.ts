import { describe, expect, it } from 'vitest'

import { parseAutopilotDirectives, sanitizeChatText } from './actionBridge'

describe('parseAutopilotDirectives — fenced (baseline)', () => {
  it('parses + strips a fenced portal-action', () => {
    const text = 'Opening your blueprints.\n```portal-action\n{"verb":"navigate","route":"/blueprints","label":"open blueprints"}\n```'
    const result = parseAutopilotDirectives(text)
    expect(result.proposals).toHaveLength(1)
    expect(result.proposals[0].verb).toBe('navigate')
    expect(result.cleanedText).toBe('Opening your blueprints.')
    expect(result.cleanedText).not.toMatch(/verb|route/)
  })
})

describe('parseAutopilotDirectives — un-fenced fallback (the leak fix)', () => {
  it('parses a bare {"verb":…} action so it FIRES, and strips it from the prose', () => {
    const text = 'Sure, taking you there.\n{"verb":"navigate","route":"/blueprints","label":"viewed your blueprints"}'
    const result = parseAutopilotDirectives(text)
    expect(result.proposals).toHaveLength(1)
    expect(result.proposals[0].verb).toBe('navigate')
    expect((result.proposals[0] as { route?: string }).route).toBe('/blueprints')
    expect(result.cleanedText).toBe('Sure, taking you there.')
    expect(result.cleanedText).not.toContain('"verb"')
  })

  it('parses a bare single-line prefillForm with a nested values object', () => {
    const text = 'Drafting the form.\n{"verb":"prefillForm","values":{"name":"demo-vpc","region":"eu-central-1"},"label":"drafted"}'
    const result = parseAutopilotDirectives(text)
    expect(result.proposals).toHaveLength(1)
    expect(result.proposals[0].verb).toBe('prefillForm')
    expect(result.cleanedText).toBe('Drafting the form.')
  })

  it('parses a bare {"steps":…} tour and strips it', () => {
    const text = 'Here is a quick tour.\n{"steps":[{"anchor":"nav:Compositions","title":"Compositions","description":"All resources."}]}'
    const result = parseAutopilotDirectives(text)
    expect(result.tour?.steps).toHaveLength(1)
    expect(result.cleanedText).toBe('Here is a quick tour.')
    expect(result.cleanedText).not.toContain('"steps"')
  })

  it('leaves a malformed bare directive line in place (no crash) rather than dropping prose', () => {
    const text = 'Note: the {"verb": is part of our protocol.'
    const result = parseAutopilotDirectives(text)
    // not a standalone JSON-object line → not parsed, prose preserved
    expect(result.proposals).toHaveLength(0)
    expect(result.cleanedText).toContain('part of our protocol')
  })

  it('does not match prose that merely mentions verb', () => {
    const text = 'The form needs a name and a region value.'
    const result = parseAutopilotDirectives(text)
    expect(result.proposals).toHaveLength(0)
    expect(result.cleanedText).toBe('The form needs a name and a region value.')
  })
})

// NOTE: sanitizeChatText deliberately does NOT trim trailing whitespace (so the streaming cursor
// doesn't jump); parseAutopilotDirectives trims. So assert on `.trim()` for exact equality.
describe('sanitizeChatText — bare directive JSON', () => {
  it('strips a completed bare {"verb":…} line', () => {
    expect(sanitizeChatText('Done.\n{"verb":"navigate","route":"/dashboard"}').trim()).toBe('Done.')
  })

  it('strips a still-streaming incomplete bare directive (no closing brace yet)', () => {
    expect(sanitizeChatText('Working...\n{"verb":"navi').trim()).toBe('Working...')
  })

  it('strips a bare {"steps":…} line', () => {
    expect(sanitizeChatText('Tour:\n{"steps":[{"anchor":"nav:X"}]}').trim()).toBe('Tour:')
  })

  it('leaves ordinary prose untouched', () => {
    const prose = 'Your VPC failed because the AWS controller is not installed. Install it from the Marketplace.'
    expect(sanitizeChatText(prose)).toBe(prose)
  })
})

describe('sanitizeChatText — existing hardening still holds', () => {
  it('still strips fenced code blocks', () => {
    expect(sanitizeChatText('text\n```\nkubectl apply -f x.yaml\n```').trim()).toBe('text')
  })

  it('still strips a bare kubectl line', () => {
    expect(sanitizeChatText('Run this:\nkubectl get pods')).not.toContain('kubectl get pods')
  })
})
