import type { ReactNode } from 'react'

import logo from '../../assets/images/logo_big.svg'

import styles from './AppShell.module.css'

interface AppShellProps {
  /** The routed page (or any node) rendered in the central content area. */
  content: ReactNode
  /** The sidebar body below the logo (typically the NavMenu widget). */
  sidebar: ReactNode
  headerLeft?: ReactNode
  headerRight?: ReactNode
  logoSrc?: string
}

/**
 * The portal shell as a single, slot-based layout: logo + sidebar | header
 * (left/right) + content. Previously this was hardcoded across WidgetPage,
 * Sidebar and Header; extracting it makes the layout one composable unit and
 * is the basis for the server-driven `AppShell` widget.
 */
const AppShell = ({ content, headerLeft, headerRight, logoSrc, sidebar }: AppShellProps) => (
  <div className={styles.shell}>
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <img alt='Krateo' className={styles.image} height={48} src={logoSrc || logo} />
      </div>
      <div className={styles.sidebarContent}>{sidebar}</div>
    </div>

    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>{headerLeft}</div>
        <div className={styles.headerRight}>{headerRight}</div>
      </div>
      <div className={styles.content}>{content}</div>
    </div>
  </div>
)

export default AppShell
