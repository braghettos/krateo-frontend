/**
 * Login `?next=` resume — post-login redirect target resolution.
 *
 * The session-resume flow (utils/logout.forceLogout, 1.3.5) parks the user's pre-expiry
 * route in the login URL: `/login?next=<encodeURIComponent(pathname + search)>`. On a
 * successful login the Login page must land the user back THERE instead of always at
 * home. `resolveNextPath` is the pure parser that decodes + sanitizes that param; these
 * tests pin its truth table (the happy resume path AND the open-redirect defenses).
 */

import { describe, it, expect } from 'vitest'

import { resolveNextPath } from './Login'

describe('resolveNextPath — post-login redirect from ?next=', () => {
  it('falls back to home when the param is absent', () => {
    expect(resolveNextPath(null)).toBe('/')
    expect(resolveNextPath('')).toBe('/')
  })

  it('resumes the encoded pre-expiry route the resume flow writes (pathname only)', () => {
    // forceLogout writes encodeURIComponent(window.location.pathname + search).
    expect(resolveNextPath(encodeURIComponent('/compositions'))).toBe('/compositions')
  })

  it('resumes a route that carries a query string (search preserved)', () => {
    const target = '/compositions/demo/rancher?tab=events'
    expect(resolveNextPath(encodeURIComponent(target))).toBe(target)
  })

  it('accepts an already-decoded absolute in-app path', () => {
    expect(resolveNextPath('/settings')).toBe('/settings')
  })

  it('rejects a protocol-relative open-redirect (//evil.com) → home', () => {
    expect(resolveNextPath(encodeURIComponent('//evil.com'))).toBe('/')
    expect(resolveNextPath('//evil.com')).toBe('/')
  })

  it('rejects a backslash-smuggled open-redirect (/\\evil.com) → home', () => {
    expect(resolveNextPath(encodeURIComponent('/\\evil.com'))).toBe('/')
  })

  it('rejects an absolute off-origin URL (https://evil.com) → home', () => {
    expect(resolveNextPath(encodeURIComponent('https://evil.com'))).toBe('/')
    // A script-scheme URL (assembled to dodge the no-script-url lint on a literal).
    const scriptScheme = `java${'script'}:alert(1)`
    expect(resolveNextPath(encodeURIComponent(scriptScheme))).toBe('/')
  })

  it('rejects a relative path with no leading slash → home', () => {
    expect(resolveNextPath('compositions')).toBe('/')
  })

  it('falls back to home on a malformed percent-encoding (decode throws)', () => {
    // A lone `%` is not valid percent-encoding → decodeURIComponent throws → home.
    expect(resolveNextPath('%')).toBe('/')
    expect(resolveNextPath('%E0%A4%A')).toBe('/')
  })
})
