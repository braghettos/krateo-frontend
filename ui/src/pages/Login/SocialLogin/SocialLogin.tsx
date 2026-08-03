import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button } from 'antd'

import type { AuthModeType } from '../Login.types'

import styles from './SocialLogin.module.css'

type SocialLoginType = {
  method: AuthModeType
}
const SocialLogin = ({ method }: SocialLoginType) => {
  if (!method.extensions?.authCodeURL || !method.graphics?.displayName) {
    return <></>
  }

  const getRandomString = () => {
    const rnd = Math.floor(Math.random() * Date.now()).toString(36)
    localStorage.setItem('KrateoSL', rnd)
    return rnd
  }

  const onSubmit = () => {
    if (method.extensions?.authCodeURL) {
      if (method.extensions.authCodeURL.indexOf('&state=') > -1) {
        const url = method.extensions.authCodeURL.substring(0, method.extensions?.authCodeURL.indexOf('&state='))
        window.location.href = `${url}&state=${getRandomString()}`
      } else {
        window.location.href = method.extensions.authCodeURL
      }
    }
  }

  return (
    <Button
      className={styles.button}
      icon={method.graphics?.icon && <FontAwesomeIcon icon={method.graphics.icon as IconProp} />}
      onClick={onSubmit}
      size='large'
      style={
        method.graphics?.backgroundColor && method.graphics?.textColor
          ? { backgroundColor: method.graphics.backgroundColor, color: method.graphics.textColor }
          : undefined
      }
    >
      {method.graphics?.displayName}
    </Button>
  )
}

export default SocialLogin
