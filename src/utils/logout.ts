// Force-logout helpers, shared by the UserMenu "Log out" action and the standalone
// `/logout` route. The route is the recovery escape hatch: when a stale token leaves the
// app in a broken render state (e.g. "Widget fetch failed: 401 Unauthorized") there's no
// usable menu, so the user (or a deep link) can hit `/logout` to force a clean session and
// return to the login screen.

/**
 * Clear every client-side session store: localStorage, sessionStorage, cookies, the Cache
 * Storage API and IndexedDB. Best-effort — each step is guarded so a logout always
 * completes even if one store is unavailable.
 */
export const clearClientSession = async (): Promise<void> => {
  try { localStorage.clear() } catch { /* ignore */ }
  try { sessionStorage.clear() } catch { /* ignore */ }

  // Expire all cookies on the current path.
  document.cookie.split(';').forEach((cookie) => {
    const eqPos = cookie.indexOf('=')
    const name = (eqPos > -1 ? cookie.slice(0, eqPos) : cookie).trim()
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
  })

  if ('caches' in window) {
    try {
      const names = await caches.keys()
      await Promise.all(names.map((name) => caches.delete(name)))
    } catch { /* ignore */ }
  }

  if (window.indexedDB && typeof indexedDB.databases === 'function') {
    try {
      const dbs = await indexedDB.databases()
      dbs.forEach((db) => {
        if (db.name) {
          indexedDB.deleteDatabase(db.name)
        }
      })
    } catch { /* ignore */ }
  }
}

/**
 * Clear the client session and hard-redirect to the login screen. The hard redirect (not a
 * client-side navigate) is deliberate: it drops the in-memory access-token cache and any
 * broken React tree, guaranteeing a clean reload.
 */
export const forceLogout = async (redirectTo = '/login'): Promise<void> => {
  try {
    await clearClientSession()
  } finally {
    window.location.replace(redirectTo)
  }
}
