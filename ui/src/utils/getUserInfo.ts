import type { AuthResponseType } from '../pages/Login/Login.types'

/**
 * The logged-in user's profile, read from the `K_user` login payload.
 *
 * There is NO runtime `/me` endpoint — authn does not consume its own token; the
 * profile is delivered only in the login response — so this localStorage read IS
 * the identity source. This is the single accessor over it; prefer it to ad-hoc
 * `localStorage.getItem('K_user')` reads (Shell/UserMenu to be migrated onto it).
 */
export type UserInfo = {
  displayName?: string
  username?: string
  avatarURL?: string
  groups?: string[]
}

export const getUserInfo = (): UserInfo => {
  const raw = localStorage.getItem('K_user')
  if (!raw) {
    return {}
  }

  try {
    const data = JSON.parse(raw) as NonNullable<AuthResponseType>
    return { ...(data.user ?? {}), groups: data.groups }
  } catch {
    return {}
  }
}
