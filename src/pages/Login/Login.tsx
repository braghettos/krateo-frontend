import { faCircleCheck } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Divider, Result, Skeleton } from 'antd'
import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'

import logo from '../../assets/images/logo_big.svg'
import { useConfigContext } from '../../context/ConfigContext'
import useCatchError from '../../hooks/useCatchError'

import styles from './Login.module.css'
import type { AuthModeType, FormType, LoginFormType } from './Login.types'
import LoginForm from './LoginForm'
import SocialLogin from './SocialLogin'

// Branding-panel defaults. The login screen renders BEFORE any backend identity,
// so its copy is config-driven (`config.login`, ConfigMap-mountable per install)
// rather than a snowplow widget — a login/auth widget would be bespoke behavior,
// which the antd-only widget registry deliberately excludes. These constants are
// the fallback when a config omits the keys. (Marketing copy, not portal data —
// the mockup's fabricated "128 compositions" stat stays dropped.)
const DEFAULT_LOGO_ALT = 'Krateo | PlatformOps'
const DEFAULT_HEADLINE = 'Ship platform resources without the YAML toil.'
const DEFAULT_SUBTITLE = 'Self-service infrastructure for your developers — compose, provision and observe cloud resources from a single control plane.'
const DEFAULT_HIGHLIGHTS = [
  'Compose cloud resources across your clusters',
  'GitOps reconciliation in real time',
  'Policy-guarded self-service catalog',
]

const Login = () => {
  const navigate = useNavigate()
  const { catchError } = useCatchError()
  const { config } = useConfigContext()

  // Config-driven branding (falls back to the built-in defaults when absent).
  const branding = config?.login
  const logoSrc = branding?.logoUrl || logo
  const logoAlt = branding?.logoAlt ?? DEFAULT_LOGO_ALT
  const headline = branding?.headline ?? DEFAULT_HEADLINE
  const subtitle = branding?.subtitle ?? DEFAULT_SUBTITLE
  const highlights = branding?.highlights?.length ? branding.highlights : DEFAULT_HIGHLIGHTS

  const authUrl = `${config!.api.AUTHN_API_BASE_URL}/strategies`

  const {
    data: methods,
    error: isMethodsError,
    isLoading: isMethodLoading,
  } = useQuery({
    queryFn: async () => {
      const res = await fetch(authUrl)
      return await res.json() as AuthModeType[]
    },
    queryKey: ['methods', authUrl],
  })

  const {
    error: isLoginError,
    isPending: isLoginLoading,
    mutateAsync: login,
  } = useMutation({
    mutationFn: async (credentials: { username: string; password: string; path: string }) => {
      const authUrl = `${config!.api.AUTHN_API_BASE_URL}${credentials.path}`

      const response = await fetch(authUrl, {
        headers: {
          Authorization: `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`,
        },
        method: 'GET',
      })

      if (response.ok) {
        const data = await response.json() as AuthModeType[]
        localStorage.setItem('K_user', JSON.stringify(data))
        void navigate('/')
      } else {
        catchError({
          message: `Login error (${response.status}: ${response.statusText})`,
          status: response.status,
        }, 'notification')
      }
    },
  })

  const onFormSubmit = useCallback(async (body: LoginFormType, type: FormType) => {
    const { password, username } = body
    const method = methods?.find(({ kind }) => kind === type)

    if (username && password && method?.path) {
      await login({ password, path: method.path, username })
    } else {
      catchError({ data: { message: 'Wrong username or password, try again with different credentials' }, status: 403 })
    }
  }, [catchError, login, methods])

  const content = useMemo(() => {
    if (isMethodLoading) {
      return <Skeleton active />
    }

    if (isMethodsError) {
      return <Result status='error' subTitle='Unable to retrieve authentication methods' title="Ops! Something didn't work" />
    }

    if (isLoginError) {
      return <Result status='error' subTitle='Error during the login operation' title="Ops! Something didn't work" />
    }

    if (methods) {
      if (methods.length === 0) {
        return (
          <Result
            status='warning'
            subTitle='Please create some authentication methods and try again'
            title='There are no authentication methods'
          />
        )
      }

      return methods.map((method, index) => {
        const { kind } = method

        if (kind === 'basic' || kind === 'ldap') {
          return (
            <div key={`login_${index}`}>
              <LoginForm
                isLoading={isLoginLoading}
                method={method}
                onSubmit={(values) => { void onFormSubmit(values, kind) }}
              />
              {((index + 1) < methods?.length) && <Divider plain>or continue with</Divider> }
            </div>
          )
        }

        return <SocialLogin key={`login_${index}`} method={method} />
      })
    }
  }, [isMethodLoading, isMethodsError, isLoginError, methods, isLoginLoading, onFormSubmit])

  return (
    <div className={styles.login}>
      <aside className={styles.aside}>
        <img alt={logoAlt} className={styles.logo} src={logoSrc} />
        <div className={styles.pitch}>
          <h1 className={styles.headline}>{headline}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          <ul className={styles.highlights}>
            {highlights.map((highlight) => (
              <li key={highlight}>
                <FontAwesomeIcon icon={faCircleCheck} /> {highlight}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className={styles.section}>
        <div className={styles.formPanel}>
          <h2 className={styles.welcome}>Welcome back</h2>
          <p className={styles.welcomeSub}>Sign in to your Krateo control plane.</p>
          {content}
        </div>
      </section>
    </div>
  )
}

export default Login
