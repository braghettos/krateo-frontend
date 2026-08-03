/**
 * Resolve the post-login landing route from the `next` value the session-resume flows write:
 *  - the basic/ldap login carries it in the URL (`/login?next=<encodeURIComponent(pathname+search)>`,
 *    forceLogout → Login page), and
 *  - the social/OIDC resume stashes it in localStorage (`K_sessionResumeNext`, set by the in-place
 *    SessionResume modal, consumed by the /auth callback) because an OIDC round-trip cannot carry
 *    app query state through the identity provider.
 *
 * Returns a SAFE in-app path only: it must decode to a single-leading-slash absolute path so an
 * attacker can't smuggle an open-redirect (`//evil.com`, `https://evil.com`, `/\evil.com`) or a
 * `javascript:` URL through the value. Anything absent, malformed, or off-origin falls back to
 * `'/'` (the home route).
 */
export const resolveNextPath = (rawNext: string | null): string => {
  const HOME = '/'
  if (!rawNext) { return HOME }

  let decoded: string
  try {
    decoded = decodeURIComponent(rawNext)
  } catch {
    return HOME
  }

  // Must be an absolute in-app path: exactly one leading slash, no scheme, no
  // protocol-relative (`//host`) or backslash trickery (`/\host`).
  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.startsWith('/\\')) {
    return HOME
  }
  return decoded
}

/** localStorage key the in-place SessionResume modal stashes the pre-expiry route in, so an
 *  OIDC/social re-auth (a full IdP redirect) can land the user back where they were. */
export const SESSION_RESUME_NEXT_KEY = 'K_sessionResumeNext'
