import { Divider } from 'antd'

import type { AuthModeType, FormType, LoginFormType } from '../Login.types'
import LoginForm from '../LoginForm'
import SocialLogin from '../SocialLogin'

type AuthMethodsProps = {
  methods: AuthModeType[]
  isLoading: boolean
  onCredentialSubmit: (values: LoginFormType, kind: FormType, method: AuthModeType) => void
}

/**
 * Renders the enabled authn strategies returned by `/strategies`, exactly as the Login page
 * presents them: a credential FORM for `basic`/`ldap` (an in-place Basic-auth GET), a branded
 * REDIRECT button for social/OIDC, and an "or continue with" divider between a credential form
 * and the methods that follow it.
 *
 * Shared by BOTH the Login page and the in-place SessionResume ("session expired") modal so the
 * two surfaces always offer the SAME set of methods. The modal previously hard-coded `basic`
 * only — an LDAP-only or social install saw a wrong form or got bounced to the full login page.
 * Consuming this component makes the modal reflect every enabled strategy and prevents the two
 * from drifting again.
 */
const AuthMethods = ({ isLoading, methods, onCredentialSubmit }: AuthMethodsProps) => {
  return (
    <>
      {methods.map((method, index) => {
        const { kind } = method

        if (kind === 'basic' || kind === 'ldap') {
          // A single "or continue with" divider sits between the credential block and the
          // social/OIDC methods that follow — i.e. only when the NEXT method is a social one,
          // never between two stacked credential forms (basic + ldap).
          const next = methods[index + 1]
          const showDivider = !!next && next.kind !== 'basic' && next.kind !== 'ldap'
          return (
            <div key={`login_${index}`}>
              <LoginForm
                isLoading={isLoading}
                method={method}
                onSubmit={(values) => { onCredentialSubmit(values, kind, method) }}
              />
              {showDivider && <Divider plain>or continue with</Divider>}
            </div>
          )
        }

        return <SocialLogin key={`login_${index}`} method={method} />
      })}
    </>
  )
}

export default AuthMethods
