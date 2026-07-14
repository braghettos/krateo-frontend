// @vitest-environment jsdom
/**
 * Component tests for the in-place SessionResumeModal (Wave-1 session honesty).
 *
 * Drives the REAL sessionResume store (raiseSessionExpired → CustomEvent → modal) end to
 * end with a mocked authn backend:
 *  - basic strategy: submitting credentials stores the fresh K_user, ROTATES the
 *    module-level token cache, resolves the pending resume 'resumed', and invalidates the
 *    react-query cache so the page refetches in place;
 *  - wrong credentials keep the modal up with an inline error (no logout, no toast);
 *  - non-basic-only installs (documented scope) fall back to the legacy forceLogout.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAccessToken, invalidateAccessTokenCache } from '../../utils/getAccessToken'
import { __resetSessionResume, isSessionResumePending, raiseSessionExpired } from '../../utils/sessionResume'

import SessionResumeModal from './SessionResumeModal'

vi.mock('../../context/ConfigContext', () => ({
  useConfigContext: () => ({
    config: { api: { AUTHN_API_BASE_URL: 'http://authn.test' } },
    isLoading: false,
  }),
}))

vi.mock('../../utils/logout', () => ({
  forceLogout: vi.fn(() => Promise.resolve()),
}))

const { forceLogout } = await import('../../utils/logout')

const BASIC_STRATEGY = { kind: 'basic', name: 'basic', path: '/basic/login' }
const OIDC_STRATEGY = { kind: 'oidc', name: 'github', path: '/oidc/github' }

const FRESH_LOGIN = {
  accessToken: 'fresh-token',
  data: null,
  groups: ['admins'],
  user: { avatarURL: '', displayName: 'Diego', username: 'diego' },
}

/** fetch stub routed by URL: /strategies discovery + the basic-auth login GET. */
const installFetchMock = (opts: { loginStatus?: number; strategies?: unknown[] }) => {
  const { loginStatus = 200, strategies = [BASIC_STRATEGY] } = opts
  const toUrl = (input: RequestInfo | URL): string => {
    if (typeof input === 'string') { return input }
    return input instanceof URL ? input.href : input.url
  }
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = toUrl(input)
    if (url.endsWith('/strategies')) {
      return Promise.resolve(new Response(JSON.stringify(strategies), { status: 200 }))
    }
    if (url.includes('/basic/login')) {
      return loginStatus === 200
        ? Promise.resolve(new Response(JSON.stringify(FRESH_LOGIN), { status: 200 }))
        : Promise.resolve(new Response('nope', { status: loginStatus, statusText: 'Unauthorized' }))
    }
    return Promise.reject(new Error(`unexpected fetch ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

let queryClient: QueryClient

const renderModal = () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionResumeModal />
    </QueryClientProvider>
  )
}

/** Raise a (real) session-expired and let the modal open + discover strategies.
 * The outcome promise is returned WRAPPED so `await raiseAndOpen()` does not flatten
 * (and block on) the still-pending resume itself. */
const raiseAndOpen = async (): Promise<{ outcome: Promise<'logout' | 'resumed'> }> => {
  let outcome!: Promise<'logout' | 'resumed'>
  act(() => { outcome = raiseSessionExpired() })
  await act(async () => { await Promise.resolve() })
  return { outcome }
}

const submitCredentials = (username: string, password: string) => {
  const [usernameInput, passwordInput] = Array.from(document.querySelectorAll<HTMLInputElement>('.ant-modal input'))
  fireEvent.change(usernameInput, { target: { value: username } })
  fireEvent.change(passwordInput, { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

beforeAll(() => {
  // antd needs these browser APIs; jsdom has neither.
  const noop = () => undefined
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({
      addEventListener: noop,
      addListener: noop,
      dispatchEvent: () => false,
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: noop,
      removeListener: noop,
    }),
    writable: true,
  })
  globalThis.ResizeObserver = class {
    disconnect = noop
    observe = noop
    unobserve = noop
  } as unknown as typeof ResizeObserver
})

beforeEach(() => {
  __resetSessionResume()
  invalidateAccessTokenCache()
  localStorage.clear()
  vi.mocked(forceLogout).mockClear()
})

afterEach(() => {
  // Unmount the previous root explicitly: a still-mounted SessionResumeModal from an
  // earlier test would ALSO answer the window event and duplicate every button query.
  cleanup()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('SessionResumeModal — in-place resume (basic strategy)', () => {
  it('re-authenticates in place: fresh K_user, rotated token cache, resumed outcome, query invalidation', async () => {
    installFetchMock({ strategies: [BASIC_STRATEGY, OIDC_STRATEGY] })

    // The pre-expiry session: the token cache is warm with the STALE token.
    localStorage.setItem('K_user', JSON.stringify({ ...FRESH_LOGIN, accessToken: 'stale-token' }))
    expect(getAccessToken()).toBe('stale-token')

    renderModal()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { outcome } = await raiseAndOpen()
    expect(await screen.findByText('Session expired')).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy()
    })
    submitCredentials('diego', 'secret')

    await waitFor(() => { expect(isSessionResumePending()).toBe(false) })

    // Fresh session stored where Login puts it…
    const stored = JSON.parse(localStorage.getItem('K_user')!) as { accessToken: string }
    expect(stored.accessToken).toBe('fresh-token')
    // …and the module-level token cache was invalidated (no stale-token replay).
    expect(getAccessToken()).toBe('fresh-token')
    // The coalesced 401 raisers are resolved as resumed (no logout, no navigation)…
    await expect(outcome).resolves.toBe('resumed')
    expect(forceLogout).not.toHaveBeenCalled()
    // …and the react-query cache is invalidated so the page refetches in place.
    expect(invalidateSpy).toHaveBeenCalled()
  })

  it('wrong credentials keep the modal open with an inline error (still pending)', async () => {
    installFetchMock({ loginStatus: 401 })
    renderModal()

    await raiseAndOpen()
    await waitFor(() => { expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy() })
    submitCredentials('diego', 'wrong')

    expect(await screen.findByText('Wrong username or password, try again.')).toBeTruthy()
    expect(isSessionResumePending()).toBe(true)
    expect(forceLogout).not.toHaveBeenCalled()
  })
})

describe('SessionResumeModal — documented fallbacks', () => {
  it('a non-basic-only install falls back to the legacy forceLogout flow', async () => {
    installFetchMock({ strategies: [OIDC_STRATEGY] })
    renderModal()

    const { outcome } = await raiseAndOpen()

    await waitFor(() => { expect(forceLogout).toHaveBeenCalledTimes(1) })
    await expect(outcome).resolves.toBe('logout')
    expect(isSessionResumePending()).toBe(false)
  })

  it('the explicit Log out button hard-wipes via forceLogout(force)', async () => {
    installFetchMock({})
    renderModal()

    const { outcome } = await raiseAndOpen()
    await waitFor(() => { expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy() })
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    await expect(outcome).resolves.toBe('logout')
    expect(forceLogout).toHaveBeenCalledWith('/login', { force: true })
  })
})
