// @vitest-environment jsdom
/**
 * Unit tests for the session-resume store/event (utils/sessionResume) + the token-cache
 * invalidation contract it depends on (utils/getAccessToken).
 *
 * Pins the Wave-1 session-honesty behaviors:
 *  - a BURST of concurrent 401s coalesces into ONE pending resume / ONE modal event;
 *  - settling resolves every coalesced caller and clears the pending flag;
 *  - with NO modal surface mounted the flow falls back to the legacy forceLogout
 *    (the documented non-basic-strategy / outside-Shell path);
 *  - a successful resume can actually rotate the token: the module-level cache in
 *    getAccessToken serves the stale token until invalidateAccessTokenCache() drops it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAccessToken, invalidateAccessTokenCache } from './getAccessToken'
import {
  __resetSessionResume,
  isSessionResumePending,
  raiseSessionExpired,
  registerSessionResumeSurface,
  SESSION_RESUME_EVENT,
  settleSessionResume,
} from './sessionResume'

// The store falls back to the legacy logout flow when no surface is mounted — spy on it.
vi.mock('./logout', () => ({
  forceLogout: vi.fn(() => Promise.resolve()),
}))

const { forceLogout } = await import('./logout')

beforeEach(() => {
  __resetSessionResume()
  invalidateAccessTokenCache()
  localStorage.clear()
  vi.mocked(forceLogout).mockClear()
})

afterEach(() => {
  __resetSessionResume()
  invalidateAccessTokenCache()
})

describe('raiseSessionExpired — burst coalescing (single modal)', () => {
  it('concurrent 401s share ONE pending promise and dispatch ONE modal event', () => {
    const unregister = registerSessionResumeSurface()
    const events: Event[] = []
    const listener = (event: Event) => { events.push(event) }
    window.addEventListener(SESSION_RESUME_EVENT, listener)

    // Simulate every widget on the page 401ing at once.
    const first = raiseSessionExpired()
    const second = raiseSessionExpired()
    const third = raiseSessionExpired()

    expect(second).toBe(first)
    expect(third).toBe(first)
    expect(events).toHaveLength(1)
    expect(isSessionResumePending()).toBe(true)
    expect(forceLogout).not.toHaveBeenCalled()

    window.removeEventListener(SESSION_RESUME_EVENT, listener)
    unregister()
  })

  it('settling resolves every coalesced caller and clears the pending flag', async () => {
    const unregister = registerSessionResumeSurface()

    const first = raiseSessionExpired()
    const second = raiseSessionExpired()

    settleSessionResume('resumed')

    await expect(first).resolves.toBe('resumed')
    await expect(second).resolves.toBe('resumed')
    expect(isSessionResumePending()).toBe(false)

    // A LATER 401 (e.g. the next expiry) starts a fresh pending resume.
    const events: Event[] = []
    const listener = (event: Event) => { events.push(event) }
    window.addEventListener(SESSION_RESUME_EVENT, listener)
    const next = raiseSessionExpired()
    expect(next).not.toBe(first)
    expect(events).toHaveLength(1)

    window.removeEventListener(SESSION_RESUME_EVENT, listener)
    settleSessionResume('logout')
    unregister()
  })

  it('isSessionResumePending gates the error-toast suppression window', () => {
    const unregister = registerSessionResumeSurface()
    expect(isSessionResumePending()).toBe(false)
    void raiseSessionExpired()
    expect(isSessionResumePending()).toBe(true)
    settleSessionResume('logout')
    expect(isSessionResumePending()).toBe(false)
    unregister()
  })
})

describe('raiseSessionExpired — legacy fallback (documented scope)', () => {
  it('with NO resume surface mounted it falls back to forceLogout and resolves logout', async () => {
    // No registerSessionResumeSurface() call: a 401 raised outside the Shell (or before
    // the modal mounts) must keep the OLD behavior instead of hanging forever.
    const outcome = raiseSessionExpired()

    expect(forceLogout).toHaveBeenCalledTimes(1)
    await expect(outcome).resolves.toBe('logout')
    expect(isSessionResumePending()).toBe(false)
  })

  it('a surface unregister (Shell unmount) restores the fallback', async () => {
    const unregister = registerSessionResumeSurface()
    unregister()

    const outcome = raiseSessionExpired()
    expect(forceLogout).toHaveBeenCalledTimes(1)
    await expect(outcome).resolves.toBe('logout')
  })
})

describe('getAccessToken cache invalidation — the resume token rotation contract', () => {
  const kUser = (accessToken: string) => JSON.stringify({ accessToken, data: null, groups: [], user: null })

  it('serves the STALE cached token until invalidateAccessTokenCache() drops it', () => {
    localStorage.setItem('K_user', kUser('stale-token'))
    expect(getAccessToken()).toBe('stale-token')

    // The resume modal writes the fresh K_user…
    localStorage.setItem('K_user', kUser('fresh-token'))
    // …but the module-level cache would keep replaying the stale token:
    expect(getAccessToken()).toBe('stale-token')

    // The invalidation the modal performs is what actually rotates the token.
    invalidateAccessTokenCache()
    expect(getAccessToken()).toBe('fresh-token')
  })

  it('after invalidation with no session stored, getAccessToken throws (no ghost token)', () => {
    localStorage.setItem('K_user', kUser('stale-token'))
    expect(getAccessToken()).toBe('stale-token')
    localStorage.removeItem('K_user')
    invalidateAccessTokenCache()
    expect(() => getAccessToken()).toThrow('No access token found')
  })
})
