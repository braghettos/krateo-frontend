import type { AuthResponseType } from '../pages/Login/Login.types'

let cachedAccessToken: string | null = null

export const getAccessToken = () => {
  if (cachedAccessToken) {
    return cachedAccessToken
  }

  const userData = localStorage.getItem('K_user')
  if (!userData) {
    throw new Error('No access token found')
  }

  const user = JSON.parse(userData) as NonNullable<AuthResponseType>
  cachedAccessToken = user.accessToken
  return cachedAccessToken
}

/**
 * Drop the module-level token cache so the next `getAccessToken()` re-reads `K_user`.
 * MUST be called whenever the stored session changes without a full page reload — the
 * in-place session-resume modal (components/SessionResume) writes a fresh `K_user` and
 * relies on this to stop every subsequent fetch from replaying the stale cached token.
 * (Login/logout previously always went through a hard redirect, which reset this cache
 * for free; in-place resume deliberately does not.)
 */
export const invalidateAccessTokenCache = (): void => {
  cachedAccessToken = null
}
