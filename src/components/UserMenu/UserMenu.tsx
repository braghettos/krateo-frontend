import type { MenuProps } from 'antd'
import { Avatar, Menu, Popover, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { useConfigContext } from '../../context/ConfigContext'
import { setLocale, SUPPORTED_LOCALES } from '../../i18n'
import type { AuthResponseType } from '../../pages/Login/Login.types'
import { clearClientSession } from '../../utils/logout'

import styles from './UserMenu.module.css'

const UserMenu = () => {
  const { i18n, t } = useTranslation()
  const { refetch } = useConfigContext()

  const userData = JSON.parse(localStorage.getItem('K_user') || '{}') as AuthResponseType
  const { avatarURL, displayName, username } = userData.user || {}

  const fullName = (displayName !== '' ? displayName : username) || ''
  const initials = fullName
    .trim()
    .split(' ')
    .map(word => word[0]?.toUpperCase())
    .slice(0, 2)
    .join('')

  // The authenticated identity's real access groups (from the K_user login payload). There is
  // no separate "role" field, so surface the actual groups instead of a fabricated label.
  const groups = (userData.groups ?? []).join(' · ')

  const onLogout = async () => {
    try {
      // Shared with the standalone /logout recovery route (src/utils/logout.ts).
      await clearClientSession()
      // Refetch config.json so the post-redirect bootstrap starts clean.
      await refetch()
    } catch (error) {
      console.error('Logout cleanup error', error)
    } finally {
      window.location.replace('/login')
    }
  }

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: <Link to='/profile'>{t('chrome.userMenu.profile')}</Link>,
    },
    {
      // Locale switcher (X2/D23): explicit user choice, persisted so it wins over the
      // Org default from config.json on every future load.
      children: SUPPORTED_LOCALES.map((locale) => ({
        key: `lang-${locale}`,
        label: t(`locales.${locale}`),
        onClick: () => setLocale(locale),
      })),
      key: 'language',
      label: `${t('chrome.userMenu.language')} (${i18n.language.slice(0, 2).toUpperCase()})`,
    },
    {
      key: '2',
      label: <Link to=''>{t('chrome.userMenu.logout')}</Link>,
      onClick: () => { void onLogout() },
    },
  ]

  return (
    <Popover
      arrow={false}
      className={styles.popover}
      content={
        <section className={styles.panel}>
          <div className={styles.userData}>
            <Avatar
              gap={2}
              size={80}
              src={avatarURL}
            >
              <Typography.Text className={styles.initials}>{initials}</Typography.Text>
            </Avatar>

            <div className={styles.details}>
              <Typography.Text className={styles.fullname}>{fullName}</Typography.Text>
              {groups && <Typography.Text className={styles.role}>{groups}</Typography.Text>}
            </div>
          </div>

          <Menu
            className={styles.menu}
            items={items}
            mode='vertical'
            selectable={false}
          />
        </section>
      }
      placement='topLeft'
      trigger='click'
    >
      <Avatar
        gap={2}
        size='default'
        src={avatarURL}
      >
        <Typography.Text>{initials}</Typography.Text>
      </Avatar>
    </Popover>
  )
}

export default UserMenu
