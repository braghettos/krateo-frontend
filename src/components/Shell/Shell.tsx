import { useEffect } from 'react'
import { Outlet } from 'react-router'

import { useConfigContext } from '../../context/ConfigContext'
import { useLoadRoutes } from '../../hooks/useLoadRoutes'
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
const HeaderChrome = () => (
  <>
    <div className={styles.headerLeft}><Breadcrumb /></div>
    <div className={styles.headerRight}><ThemeToggle /><Notifications /><UserMenu /></div>
  </>
)

/**
 * The persistent app shell, as a React Router layout route. The visible chrome is
 * the server-driven `Layout` widget loaded from config `INIT` (its Sider hosts the
 * nav Menu, its Header/Content fall back to the shell slots below). This component
 * owns only what the engine must: the auth gate, route loading, the global
 * Drawer/Modal overlays, and the shell slots the Layout widget projects — the
 * routed `<Outlet/>` and the interactive header chrome. Child routes render into
 * the Outlet, so the shell mounts once and only the content swaps on navigation.
 */
export const ShellRoute = () => {
  const { config } = useConfigContext()
  useLoadRoutes()

  useEffect(() => {
    if (!localStorage.getItem('K_user')) {
      window.location.replace('/login')
    }
  }, [])

  return (
    <ShellSlotsProvider value={{ content: <Outlet />, header: <HeaderChrome /> }}>
      <WidgetRenderer key='shell' widgetEndpoint={config!.api.INIT} />
      <Drawer />
      <Modal />
    </ShellSlotsProvider>
  )
}

export default ShellRoute
