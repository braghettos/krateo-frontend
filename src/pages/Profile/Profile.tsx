import { Avatar, Card, Col, Descriptions, Row, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'

import AppShell from '../../components/AppShell'
import Breadcrumb from '../../components/Breadcrumb'
import Notifications from '../../components/Notifications'
import ThemeToggle from '../../components/ThemeToggle'
import UserMenu from '../../components/UserMenu'
import WidgetRenderer from '../../components/WidgetRenderer'
import { useConfigContext } from '../../context/ConfigContext'

import styles from './Profile.module.css'

type UserData = {
  user: {
    avatarURL: string
    displayName: string
    username: string
    email: string
  }
  groups: string[]
} | undefined

const Profile = () => {
  const { config } = useConfigContext()
  const lsUserData = localStorage.getItem('K_user')
  const [userData, setUserData] = useState<UserData>(undefined)

  useEffect(() => {
    if (!lsUserData) {
      window.location.replace('/login')
    } else {
      setUserData(JSON.parse(lsUserData) as UserData)
    }
  }, [lsUserData])

  return (
    <AppShell
      content={
        <Card>
          <Row>
            <Col className={styles.avatar} sm={24}>
              <Avatar size={200} src={userData?.user.avatarURL} />
            </Col>
            <Col md={12} sm={24}>
              <Space direction='vertical' size='large'>
                <div>
                  <Typography.Text className={styles.fullname}>{userData?.user.displayName}</Typography.Text>
                  <a className={styles.email} href={`mailto:${userData?.user.email}`}>{userData?.user.email}</a>
                </div>

                <Descriptions column={1}>
                  <Descriptions.Item label='Username'>
                    {userData?.user.username}
                  </Descriptions.Item>
                  <Descriptions.Item label='Groups'>
                    {userData?.groups.join(', ')}
                  </Descriptions.Item>
                </Descriptions>
              </Space>
            </Col>
          </Row>
        </Card>
      }
      headerLeft={<Breadcrumb />}
      headerRight={<><ThemeToggle /><Notifications /><UserMenu /></>}
      sidebar={<WidgetRenderer key={'sidebar'} widgetEndpoint={config!.api.INIT} />}
    />
  )
}

export default Profile
