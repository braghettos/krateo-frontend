import { describe, expect, it } from 'vitest'

import { isTimeoutError } from './WidgetStates'

describe('isTimeoutError — timeout vs hard error classification', () => {
  it('classifies 503/504 gateway statuses as timeouts', () => {
    expect(isTimeoutError({ status: 503 })).toBe(true)
    expect(isTimeoutError({ status: 504 })).toBe(true)
  })

  it('classifies deadline / timeout / cancelled / aborted messages as timeouts', () => {
    expect(isTimeoutError(new Error('context deadline exceeded'))).toBe(true)
    expect(isTimeoutError(new Error('Request timeout'))).toBe(true)
    expect(isTimeoutError(new Error('the operation timed out'))).toBe(true)
    expect(isTimeoutError(new Error('signal is aborted'))).toBe(true)
    expect(isTimeoutError(new Error('operation was canceled'))).toBe(true)
    expect(isTimeoutError(new Error('operation was cancelled'))).toBe(true)
    expect(isTimeoutError(new Error('Widget fetch failed: 504 Gateway Timeout'))).toBe(true)
    expect(isTimeoutError('503 Service Unavailable')).toBe(true)
  })

  it('does NOT classify hard errors (400/401/403/500, generic failures) as timeouts', () => {
    expect(isTimeoutError({ status: 400 })).toBe(false)
    expect(isTimeoutError({ status: 401 })).toBe(false)
    expect(isTimeoutError({ status: 500 })).toBe(false)
    expect(isTimeoutError(new Error('Widget kind does not have a status'))).toBe(false)
    expect(isTimeoutError(new Error('Failed to fetch'))).toBe(false)
    expect(isTimeoutError(null)).toBe(false)
    expect(isTimeoutError(undefined)).toBe(false)
  })
})
