import { describe, expect, it } from 'vitest'

import { LOCAL_TIME_OF_DAY_TOKEN, localTimeOfDay, resolveLocalTokens } from './localTokens'

/** A Date at a fixed LOCAL hour (minutes/seconds irrelevant to the bucketing). */
const atHour = (hour: number): Date => new Date(2026, 0, 1, hour, 0, 0)

describe('localTimeOfDay', () => {
  it('buckets <12 as morning', () => {
    expect(localTimeOfDay(atHour(0))).toBe('morning')
    expect(localTimeOfDay(atHour(9))).toBe('morning')
    expect(localTimeOfDay(atHour(11))).toBe('morning')
  })

  it('buckets 12..17 as afternoon', () => {
    expect(localTimeOfDay(atHour(12))).toBe('afternoon')
    expect(localTimeOfDay(atHour(14))).toBe('afternoon')
    expect(localTimeOfDay(atHour(17))).toBe('afternoon')
  })

  it('buckets >=18 as evening', () => {
    expect(localTimeOfDay(atHour(18))).toBe('evening')
    expect(localTimeOfDay(atHour(23))).toBe('evening')
  })
})

describe('resolveLocalTokens', () => {
  it('replaces the {localTimeOfDay} token with the current browser-local bucket', () => {
    // The greeting case: jq emits "Good {localTimeOfDay}, Admin"; the widget resolves it
    // client-side so it reflects the viewer's clock, not snowplow's frozen server `now`.
    const out = resolveLocalTokens(`Good ${LOCAL_TIME_OF_DAY_TOKEN}, Admin`)
    expect(out).toMatch(/^Good (morning|afternoon|evening), Admin$/)
    expect(out).not.toContain(LOCAL_TIME_OF_DAY_TOKEN)
  })

  it('replaces EVERY occurrence of the token', () => {
    const out = resolveLocalTokens(`${LOCAL_TIME_OF_DAY_TOKEN}/${LOCAL_TIME_OF_DAY_TOKEN}`)
    expect(out).not.toContain(LOCAL_TIME_OF_DAY_TOKEN)
    expect(out).toMatch(/^(morning|afternoon|evening)\/(morning|afternoon|evening)$/)
  })

  it('returns token-free text unchanged (no needless allocation path)', () => {
    expect(resolveLocalTokens('Welcome')).toBe('Welcome')
  })

  it('passes a non-string (undefined) through unchanged', () => {
    expect(resolveLocalTokens(undefined)).toBeUndefined()
  })
})
