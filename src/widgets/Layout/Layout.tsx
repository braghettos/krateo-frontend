import { Layout as AntdLayout } from 'antd'

import { ShellSlotsProvider, useShellSlots } from '../../components/Shell/ShellSlots'
import type { ShellSlots } from '../../components/Shell/ShellSlots'
import WidgetRenderer from '../../components/WidgetRenderer'
import type { ResourcesRefs, WidgetProps } from '../../types/Widget'
import { getEndpointUrl } from '../../utils/utils'

import styles from './Layout.module.css'
import type { Layout as WidgetType } from './Layout.type'

export type LayoutWidgetData = WidgetType['spec']['widgetData']

const { Content, Footer, Header, Sider } = AntdLayout

// Stable empty slots — a Layout resets the shell-slot context for its descendants
// (see render), so a nested Layout inherits none of the app-shell chrome.
const EMPTY_SHELL_SLOTS: ShellSlots = {}

const slot = (resourceRefId: string | undefined, resourcesRefs: ResourcesRefs) => {
  if (!resourceRefId) { return null }
  const endpoint = getEndpointUrl(resourceRefId, resourcesRefs)
  return endpoint ? <WidgetRenderer widgetEndpoint={endpoint} /> : null
}

/**
 * Faithful wrapper of antd `Layout`: Header / Sider / Content / Footer regions,
 * each rendering a child widget resolved from `resourcesRefs`. When a Sider is
 * present it sits full-height on the left with Header/Content/Footer stacked
 * beside it (antd's canonical sidebar layout).
 */
const Layout = ({ resourcesRefs, widgetData }: WidgetProps<LayoutWidgetData>) => {
  const { content, footer, hasSider, header, sider } = widgetData
  // The app shell (loaded via INIT) is the one Layout that reads real slots: regions
  // the CR leaves unset fall back to engine chrome (header → interactive controls,
  // content → the routed <Outlet/>, sider footer → the user block). Every Layout then
  // resets these to empty for its subtree (see the wrapped return), so a NESTED Layout
  // reads none of them and renders purely from its own resourceRefIds.
  const shell = useShellSlots()
  const headerContent = header ? slot(header, resourcesRefs) : shell.header
  const contentBody = content ? slot(content, resourcesRefs) : shell.content

  const regions = (
    <>
      {headerContent ? <Header className={styles.header}>{headerContent}</Header> : null}
      <Content className={styles.content}>{contentBody}</Content>
      {footer ? <Footer>{slot(footer, resourcesRefs)}</Footer> : null}
    </>
  )

  const layout = !sider ? (
    <AntdLayout className={styles.shell}>{regions}</AntdLayout>
  ) : (
    <AntdLayout className={styles.shell} hasSider={hasSider ?? true}>
      <Sider
        breakpoint={sider.breakpoint}
        collapsedWidth={sider.collapsedWidth}
        collapsible={sider.collapsible}
        defaultCollapsed={sider.defaultCollapsed}
        reverseArrow={sider.reverseArrow}
        theme={sider.theme}
        width={sider.width}
      >
        <div className={styles.sider}>
          <div className={styles.siderBody}>{slot(sider.resourceRefId, resourcesRefs)}</div>
          {shell.siderFooter}
        </div>
      </Sider>
      <AntdLayout>{regions}</AntdLayout>
    </AntdLayout>
  )

  // Scope the app-shell slots to THIS Layout: descendants get empty slots, so a nested
  // Layout (rendered inside `content`) inherits no header / content / sider-footer chrome.
  return <ShellSlotsProvider value={EMPTY_SHELL_SLOTS}>{layout}</ShellSlotsProvider>
}

export default Layout
