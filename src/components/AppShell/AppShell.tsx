import { Layout } from 'antd'
import type { ReactNode } from 'react'

import logo from '../../assets/images/logo_big.svg'

import styles from './AppShell.module.css'

const { Content, Header, Sider } = Layout

/** antd `Layout.Sider` knobs surfaced on the shell (defaults preserve the fixed 250px sidebar). */
export interface AppShellSider {
  /** antd Sider `width` in px. Defaults to 250. */
  width?: number
  /** antd Sider `collapsible` — renders a collapse trigger. */
  collapsible?: boolean
  /** antd Sider `collapsedWidth` in px. */
  collapsedWidth?: number
  /** antd Sider responsive `breakpoint` — auto-collapses below it. */
  breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  /** antd Sider `theme`. */
  theme?: 'light' | 'dark'
  /** antd Sider `defaultCollapsed` — initial collapsed state. */
  defaultCollapsed?: boolean
}

interface AppShellProps {
  /** The routed page (or any node) rendered in the central content area. */
  content: ReactNode
  /** The sidebar body below the logo (typically the Menu widget). */
  sidebar: ReactNode
  headerLeft?: ReactNode
  headerRight?: ReactNode
  logoSrc?: string
  /** antd Sider configuration; omitted → a fixed 250px, non-collapsible sidebar. */
  sider?: AppShellSider
}

/**
 * The portal shell built on antd `Layout`: a `Sider` (logo + nav) and a `Header`
 * (left/right slots) around the `Content`. Each region is a slot filled by a
 * widget (or app chrome). The Sider's themed background is overridden with the
 * brand gradient in CSS; everything else is antd's Layout. Backs both the routed
 * shell (WidgetPage) and the server-driven `AppShell` widget.
 */
const AppShell = ({ content, headerLeft, headerRight, logoSrc, sidebar, sider }: AppShellProps) => (
  <Layout className={styles.shell} hasSider>
    <Sider
      breakpoint={sider?.breakpoint}
      className={styles.sidebar}
      collapsedWidth={sider?.collapsedWidth}
      collapsible={sider?.collapsible}
      defaultCollapsed={sider?.defaultCollapsed}
      theme={sider?.theme ?? 'light'}
      width={sider?.width ?? 250}
    >
      <div className={styles.sidebarInner}>
        <div className={styles.logo}>
          <img alt='Krateo' className={styles.image} height={48} src={logoSrc || logo} />
        </div>
        <div className={styles.sidebarContent}>{sidebar}</div>
      </div>
    </Sider>

    <Layout className={styles.container}>
      <Header className={styles.header}>
        <div className={styles.headerLeft}>{headerLeft}</div>
        <div className={styles.headerRight}>{headerRight}</div>
      </Header>
      <Content className={styles.content}>{content}</Content>
    </Layout>
  </Layout>
)

export default AppShell
