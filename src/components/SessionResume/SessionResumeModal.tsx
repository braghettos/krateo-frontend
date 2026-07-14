/**
 * App-level "Session expired" modal — the in-place session-resume surface (Wave-1 session
 * honesty). Mounted ONCE inside the Shell next to the global Drawer/Modal overlays and
 * opened via the `SESSION_RESUME_EVENT` window CustomEvent (utils/sessionResume), so any
 * fetch layer can raise it on a 401 without prop drilling; concurrent 401s coalesce into
 * this single modal.
 *
 * Resume flow (basic strategy only — the same authn flow Login.tsx implements):
 *   1. On open, fetch `${AUTHN_API_BASE_URL}/strategies` and pick the `kind === 'basic'` one.
 *   2. Submit username/password as a Basic-auth GET to the strategy's path.
 *   3. On success: store the fresh login payload in `K_user`, invalidate the module-level
 *      token cache (utils/getAccessToken), settle the pending resume as 'resumed', and
 *      invalidate ALL react-query queries — active ones (including the 401-errored widget
 *      queries) refetch with the fresh token, so the page resumes exactly where it was.
 *
 * Documented fallbacks (deliberate scope — non-basic strategies do NOT resume in place):
 *   - No basic strategy available (pure OIDC/social install) → legacy `forceLogout()`,
 *     which preserves the route via `/login?next=` for the full login page's redirects.
 *   - Explicit "Log out" choice → `forceLogout('/login', { force: true })` hard wipe.
 */

import { useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Form, Input, Modal } from 'antd'
import { useCallback, useEffect, useState } from 'react'

import { useConfigContext } from '../../context/ConfigContext'
import type { AuthModeType, AuthResponseType, LoginFormType } from '../../pages/Login/Login.types'
import { invalidateAccessTokenCache } from '../../utils/getAccessToken'
import { forceLogout } from '../../utils/logout'
import { registerSessionResumeSurface, SESSION_RESUME_EVENT, settleSessionResume } from '../../utils/sessionResume'

const SessionResumeModal = () => {
  const { config } = useConfigContext()
  const queryClient = useQueryClient()

  const [open, setOpen] = useState(false)
  const [basicStrategy, setBasicStrategy] = useState<AuthModeType | null>(null)
  const [strategiesError, setStrategiesError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const authBaseUrl = config?.api.AUTHN_API_BASE_URL

  // Single app-level mount: open on the module-level event, and register this surface so
  // raiseSessionExpired knows an in-place resume is possible (otherwise it falls back).
  useEffect(() => {
    const handleOpen = () => {
      setSubmitError(null)
      setOpen(true)
    }
    window.addEventListener(SESSION_RESUME_EVENT, handleOpen)
    const unregister = registerSessionResumeSurface()
    return () => {
      window.removeEventListener(SESSION_RESUME_EVENT, handleOpen)
      unregister()
    }
  }, [])

  // On open, discover the basic strategy via the same `/strategies` call Login uses. The
  // token is dead, but `/strategies` is the pre-auth endpoint so it needs no Authorization.
  useEffect(() => {
    if (!open || !authBaseUrl) { return }
    let cancelled = false
    const discover = async () => {
      setStrategiesError(false)
      try {
        const res = await fetch(`${authBaseUrl}/strategies`)
        if (!res.ok) { throw new Error(`strategies ${res.status}`) }
        const methods = await res.json() as AuthModeType[]
        if (cancelled) { return }
        const basic = methods.find(({ kind }) => kind === 'basic') ?? null
        if (basic) {
          setBasicStrategy(basic)
        } else {
          // Documented scope: only the basic strategy resumes in place. Anything else
          // (OIDC/social/LDAP-only installs) falls back to the legacy forceLogout flow,
          // which parks the current route in /login?next= for the full login page.
          setOpen(false)
          settleSessionResume('logout')
          void forceLogout()
        }
      } catch {
        if (!cancelled) { setStrategiesError(true) }
      }
    }
    void discover()
    return () => { cancelled = true }
  }, [open, authBaseUrl])

  const onLogout = useCallback(() => {
    setOpen(false)
    settleSessionResume('logout')
    // Explicit user choice → the old hard wipe (clean session, back to login).
    void forceLogout('/login', { force: true })
  }, [])

  const onSubmit = useCallback(async ({ password, username }: LoginFormType) => {
    if (!basicStrategy || !authBaseUrl) { return }
    setSubmitting(true)
    setSubmitError(null)
    try {
      // Same authn basic flow as Login.tsx: Basic-auth GET against the strategy path.
      const res = await fetch(`${authBaseUrl}${basicStrategy.path}`, {
        headers: {
          Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        },
        method: 'GET',
      })
      if (!res.ok) {
        setSubmitError(res.status === 401 || res.status === 403
          ? 'Wrong username or password, try again.'
          : `Sign-in failed (${res.status}: ${res.statusText}), please retry.`)
        return
      }
      const data = await res.json() as AuthResponseType
      // Store the fresh session exactly where Login puts it…
      localStorage.setItem('K_user', JSON.stringify(data))
      // …and drop the module-level token cache so the very next fetch uses the new token.
      invalidateAccessTokenCache()
      setOpen(false)
      settleSessionResume('resumed')
      // Resume in place: invalidate everything — active queries (including the 401-errored
      // widget queries on screen) refetch with the fresh token; no navigation, no state loss.
      await queryClient.invalidateQueries()
    } catch {
      setSubmitError('Could not reach the authentication service, please retry.')
    } finally {
      setSubmitting(false)
    }
  }, [authBaseUrl, basicStrategy, queryClient])

  return (
    <Modal
      closable={false}
      destroyOnHidden
      footer={null}
      keyboard={false}
      maskClosable={false}
      open={open}
      title='Session expired'
      zIndex={2000}
    >
      <p>Your session has expired. Sign in to continue right where you left off.</p>
      {strategiesError && (
        <Alert
          message='Unable to reach the authentication service. Retry in a moment, or log out.'
          showIcon
          style={{ marginBottom: 16 }}
          type='error'
        />
      )}
      {submitError && (
        <Alert message={submitError} showIcon style={{ marginBottom: 16 }} type='error' />
      )}
      <Form
        autoComplete='off'
        disabled={submitting || !basicStrategy}
        layout='vertical'
        name='sessionResume'
        onFinish={(values: LoginFormType) => { void onSubmit(values) }}
        requiredMark={false}
      >
        <Form.Item
          label='Username'
          name='username'
          rules={[{ message: 'Insert a username', required: true }]}
        >
          <Input size='large' />
        </Form.Item>
        <Form.Item
          label='Password'
          name='password'
          rules={[{ message: 'Insert a password', required: true }]}
        >
          <Input.Password size='large' />
        </Form.Item>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button disabled={false} onClick={onLogout}>Log out</Button>
          <Button htmlType='submit' loading={submitting} type='primary'>
            Sign in
          </Button>
        </div>
      </Form>
    </Modal>
  )
}

export default SessionResumeModal
