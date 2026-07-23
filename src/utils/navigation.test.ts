// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

import { isExternalUrl, navigateOrExternal } from './navigation'

describe('isExternalUrl', () => {
  it('is true for http(s) URLs', () => {
    expect(isExternalUrl('https://github.com/o/r/pull/2')).toBe(true)
    expect(isExternalUrl('http://example.com')).toBe(true)
    expect(isExternalUrl('  HTTPS://x.io  ')).toBe(true)
  })
  it('is false for in-app routes and blanks', () => {
    expect(isExternalUrl('/compositions/ns/name')).toBe(false)
    expect(isExternalUrl('/resources/cluster/core/v1/namespaces/x')).toBe(false)
    expect(isExternalUrl('')).toBe(false)
    expect(isExternalUrl(undefined)).toBe(false)
    expect(isExternalUrl('mailto:x@y.z')).toBe(false)
  })
})

describe('navigateOrExternal', () => {
  it('opens an external URL in a new tab, never touching the router', () => {
    const navigate = vi.fn()
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    navigateOrExternal(navigate, 'https://github.com/o/r/pull/2')
    expect(open).toHaveBeenCalledWith('https://github.com/o/r/pull/2', '_blank', 'noopener,noreferrer')
    expect(navigate).not.toHaveBeenCalled()
    open.mockRestore()
  })
  it('routes an internal path through react-router (with the optional resolver)', () => {
    const navigate = vi.fn()
    navigateOrExternal(navigate, '/compositions/ns/name')
    expect(navigate).toHaveBeenCalledWith('/compositions/ns/name')

    const resolve = (p: string) => `${p}?merged=1`
    navigateOrExternal(navigate, '/compositions', resolve)
    expect(navigate).toHaveBeenCalledWith('/compositions?merged=1')
  })
  it('is a no-op for a blank/undefined path', () => {
    const navigate = vi.fn()
    navigateOrExternal(navigate, '')
    navigateOrExternal(navigate, undefined)
    expect(navigate).not.toHaveBeenCalled()
  })
})
