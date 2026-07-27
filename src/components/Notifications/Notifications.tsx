import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Badge, Button, Drawer } from 'antd'
import { useState } from 'react'

import { useConfigContext } from '../../context/ConfigContext'
import { useGetEvents } from '../../hooks/useGetEvents'
import WidgetRenderer from '../WidgetRenderer'

import styles from './Notifications.module.css'

/**
 * Header bell: always-on SSE subscription drives the warning dot; the Drawer
 * body is the `list-notifications` Listy widget CR (portal chart), which opens
 * its own SSE subscription sharing the singleton connection when the drawer opens.
 *
 * Badge shows a warning dot ONLY when ≥1 Warning event exists (exception-only
 * UX rule) — no count number.
 */
const Notifications = ({ topic = 'krateo' }: { topic?: string } = {}) => {
  const [drawerVisible, setDrawerVisible] = useState(false)
  const { config } = useConfigContext()

  const { data: notifications } = useGetEvents({ registerToSSE: true, topic })
  const hasWarning = (notifications ?? []).some(n => n.type === 'Warning')

  const ns = new URLSearchParams((config?.api.INIT ?? '').split('?')[1] ?? '').get('namespace') ?? 'krateo-system'
  const listEndpoint = `/call?resource=listies&apiVersion=widgets.templates.krateo.io/v1beta1&name=list-notifications&namespace=${ns}`

  const bellButton = (
    <Button
      className={styles.icon}
      icon={<FontAwesomeIcon icon={['fas', 'bell'] as IconProp} />}
      onClick={() => setDrawerVisible(true)}
      shape='circle'
      type='text'
    />
  )

  return (
    <>
      <span className={styles.badge}>
        {hasWarning
          ? <Badge dot offset={[-4, 4]} status='warning'>{bellButton}</Badge>
          : bellButton}
      </span>

      <Drawer onClose={() => setDrawerVisible(false)} open={drawerVisible} title='Notifications' width={550}>
        {drawerVisible && <WidgetRenderer widgetEndpoint={listEndpoint} />}
      </Drawer>
    </>
  )
}

export default Notifications
