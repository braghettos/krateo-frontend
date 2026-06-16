import { Layout as AntdLayout } from 'antd'

import { useShellSlots } from '../../components/Shell/ShellSlots'
import WidgetRenderer from '../../components/WidgetRenderer'
import type { ResourcesRefs, WidgetProps } from '../../types/Widget'
import { getEndpointUrl } from '../../utils/utils'

import styles from './Layout.module.css'
import type { Layout as WidgetType } from './Layout.type'

export type LayoutWidgetData = WidgetType['spec']['widgetData']

const { Content, Footer, Header, Sider } = AntdLayout

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
  // When acting as the app shell (loaded via INIT), regions the CR leaves unset
  // fall back to engine-owned slots: header → interactive chrome, content → the
  // routed <Outlet/>. Outside the shell these are undefined and render nothing.
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

  if (!sider) {
    return <AntdLayout className={styles.shell}>{regions}</AntdLayout>
  }

  return (
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
        {slot(sider.resourceRefId, resourcesRefs)}
      </Sider>
      <AntdLayout>{regions}</AntdLayout>
    </AntdLayout>
  )
}

export default Layout
