import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Space, Spin, Typography } from 'antd'
import { useEffect } from 'react'

import { forceLogout } from '../../utils/logout'

// Standalone recovery route, registered outside the app shell (like /login and /auth) so it
// resolves even when the snowplow-driven pages are in a broken render state (e.g. a stale token
// leaving widgets stuck on "401 Unauthorized"). Hitting /logout force-clears the client session
// and hard-redirects to /login. Chrome-less by design: it renders only the spinner.
const Logout = () => {
  useEffect(() => {
    void forceLogout()
  }, [])

  return (
    <Space
      direction='vertical'
      size='large'
      style={{ alignItems: 'center', height: '100vh', justifyContent: 'center', width: '100%' }}
    >
      <Spin indicator={<FontAwesomeIcon icon={['fas', 'spinner'] as IconProp} spin />} size='large' />
      <Typography.Text>Signing out...</Typography.Text>
    </Space>
  )
}

export default Logout
