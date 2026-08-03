import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { forceLogout, showSessionExpired, __resetLogoutGuards } from './logout'

// The node test env has no DOM; stub the minimal document/window surface logout.ts touches.
// Each created element records its click handlers so a test can "click" a labelled button.

interface FakeEl {
  addEventListener: (type: string, handler: () => void) => void
  append: (...nodes: FakeEl[]) => void
  click: () => void
  focus: () => void
  handlers: Record<string, (() => void)[]>
  id: string
  remove: () => void
  setAttribute: (name: string, value: string) => void
  style: { cssText: string }
  tagName: string
  textContent: string
  type: string
}

let created: FakeEl[] = []
let bodyChildren: FakeEl[] = []
let replaceCalls: string[] = []
let currentPathname = '/compositions'

const makeEl = (tagName: string): FakeEl => {
  const handlers: Record<string, (() => void)[]> = {}
  const el: FakeEl = {
    addEventListener: (type, handler) => { (handlers[type] ??= []).push(handler) },
    append: (...nodes) => { nodes.forEach((node) => { /* children ignored */ void node }) },
    click: () => { (handlers.click ?? []).forEach((fn) => fn()) },
    focus: () => { /* no-op */ },
    handlers,
    id: '',
    remove: () => { bodyChildren = bodyChildren.filter((child) => child !== el) },
    setAttribute: () => { /* no-op */ },
    style: { cssText: '' },
    tagName,
    textContent: '',
    type: '',
  }
  created.push(el)
  return el
}

/** Find the created button whose textContent matches, then fire its click handlers. */
const clickButton = (label: string): void => {
  const button = created.find((el) => el.tagName === 'button' && el.textContent === label)
  if (!button) { throw new Error(`no button labelled "${label}"`) }
  button.click()
}

beforeEach(() => {
  created = []
  bodyChildren = []
  replaceCalls = []
  __resetLogoutGuards()

  vi.stubGlobal('document', {
    body: { append: (el: FakeEl) => { bodyChildren.push(el) } },
    cookie: '',
    createElement: (tag: string) => makeEl(tag),
  })
  vi.stubGlobal('window', {
    indexedDB: undefined,
    location: {
      get pathname() { return currentPathname },
      replace: (url: string) => { replaceCalls.push(url) },
      search: '',
    },
  })
  vi.stubGlobal('localStorage', { clear: () => { /* no-op */ } })
  vi.stubGlobal('sessionStorage', { clear: () => { /* no-op */ } })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('showSessionExpired', () => {
  it('resolves "resume" when Re-authenticate is clicked', async () => {
    const promise = showSessionExpired()
    clickButton('Re-authenticate')
    await expect(promise).resolves.toBe('resume')
  })

  it('resolves "logout" when Log out is clicked', async () => {
    const promise = showSessionExpired()
    clickButton('Log out')
    await expect(promise).resolves.toBe('logout')
  })

  it('coalesces concurrent calls into a single modal / promise', async () => {
    const first = showSessionExpired()
    const second = showSessionExpired()
    expect(first).toBe(second)
    // Only one overlay was mounted.
    expect(bodyChildren).toHaveLength(1)
    clickButton('Log out')
    await Promise.all([first, second])
  })

  it('mounts and then removes the overlay on choice', async () => {
    const promise = showSessionExpired()
    expect(bodyChildren).toHaveLength(1)
    clickButton('Log out')
    await promise
    expect(bodyChildren).toHaveLength(0)
  })
})

describe('forceLogout', () => {
  it('hard-wipes immediately (no prompt) on the /logout recovery route', async () => {
    currentPathname = '/logout'
    await forceLogout()
    // No modal shown.
    expect(bodyChildren).toHaveLength(0)
    expect(replaceCalls).toEqual(['/login'])
  })

  it('hard-wipes immediately when force:true is passed', async () => {
    currentPathname = '/compositions'
    await forceLogout('/login', { force: true })
    expect(bodyChildren).toHaveLength(0)
    expect(replaceCalls).toEqual(['/login'])
  })

  it('on a background 401, prompts and redirects to /login?next= on resume (route preserved)', async () => {
    currentPathname = '/compositions'
    const promise = forceLogout()
    // A modal is shown instead of an immediate wipe.
    expect(bodyChildren).toHaveLength(1)
    clickButton('Re-authenticate')
    await promise
    expect(replaceCalls).toEqual([`/login?next=${encodeURIComponent('/compositions')}`])
  })

  it('on a background 401, hard-wipes to /login when the user chooses Log out', async () => {
    currentPathname = '/compositions'
    const promise = forceLogout()
    expect(bodyChildren).toHaveLength(1)
    clickButton('Log out')
    await promise
    expect(replaceCalls).toEqual(['/login'])
  })

  it('is guarded: a burst of 401s shows exactly one prompt', async () => {
    currentPathname = '/compositions'
    const first = forceLogout()
    // The second call returns early (loggingOut guard).
    const second = forceLogout()
    expect(bodyChildren).toHaveLength(1)
    clickButton('Log out')
    await Promise.all([first, second])
    expect(replaceCalls).toEqual(['/login'])
  })
})
