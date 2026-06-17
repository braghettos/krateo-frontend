import { Avatar, Input } from 'antd'
import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'

import { useConfigContext } from '../../context/ConfigContext'
import Drawer from '../../widgets/Drawer'
import Modal from '../../widgets/Modal'
import Breadcrumb from '../Breadcrumb'
import Notifications from '../Notifications'
import ThemeToggle from '../ThemeToggle'
import UserMenu from '../UserMenu'
import WidgetRenderer from '../WidgetRenderer'

import styles from './Shell.module.css'
import { ShellSlotsProvider } from './ShellSlots'

/** Interactive app chrome rendered in the Layout header — client-state-driven
 * controls (not server data), so they live in the engine, not as widgets. */
const HeaderChrome = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  // Navigate to the data-driven results route. useWidgetQuery folds the browser
  // `?q=` into `?extras={"q":...}`, which the `global-search` RESTAction filters
  // server-side — so the Input only has to route there.
  const onSearch = (term: string) => {
    const query = term.trim()
    if (query) { void navigate(`/search?q=${encodeURIComponent(query)}`) }
  }
  return (
    <>
      <div className={styles.headerLeft}>
        <Breadcrumb />
        <Input.Search
          allowClear
          className={styles.search}
          onChange={(event) => setSearchTerm(event.target.value)}
          onSearch={onSearch}
          placeholder='Search resources, blueprints…'
          value={searchTerm}
        />
      </div>
      <div className={styles.headerRight}><ThemeToggle /><Notifications /><UserMenu /></div>
    </>
  )
}

/** Compact brand lockup pinned to the top of the Sider — a gradient mark + the
 * wordmark, matching the mockup (the bundled SVG is the full marketing logo, too
 * large/heavy for the app sidebar). */
const Brand = () => (
  <div className={styles.brand}>
    <span className={styles.brandMark}>K</span>
    <span className={styles.brandName}>Krateo</span>
  </div>
)

/** User block pinned to the bottom of the Sider (avatar + name from the token). */
const SiderFooter = () => {
  const { user } = JSON.parse(localStorage.getItem('K_user') || '{}') as { user?: { avatarURL?: string; displayName?: string; username?: string } }
  const name = user?.displayName || user?.username || ''
  return (
    <div className={styles.siderFooter}>
      <Avatar size={30} src={user?.avatarURL}>{name.slice(0, 1).toUpperCase()}</Avatar>
      <span className={styles.siderFooterName}>{name}</span>
    </div>
  )
}

/**
 * The persistent app shell, as a React Router layout route. The visible chrome is
 * the server-driven `Layout` widget loaded from config `INIT` (its Sider hosts the
 * nav Menu, its Header/Content fall back to the shell slots below). This component
 * owns only what the engine must: the auth gate, the global Drawer/Modal
 * overlays, and the shell slots the Layout widget projects — the
 * routed `<Outlet/>` and the interactive header chrome. Child routes render into
 * the Outlet, so the shell mounts once and only the content swaps on navigation.
 */
export const ShellRoute = () => {
  const { config } = useConfigContext()

  useEffect(() => {
    if (!localStorage.getItem('K_user')) {
      window.location.replace('/login')
    }
  }, [])

  return (
    <ShellSlotsProvider value={{ brand: <Brand />, content: <Outlet />, header: <HeaderChrome />, siderFooter: <SiderFooter /> }}>
      <WidgetRenderer key='shell' widgetEndpoint={config!.api.INIT} />
      <Drawer />
      <Modal />
    </ShellSlotsProvider>
  )
}

export default ShellRoute
