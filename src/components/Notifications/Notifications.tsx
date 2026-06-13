import { BellFilled } from '@ant-design/icons'
import { Badge, Button, Drawer, Skeleton } from 'antd'
import { useState } from 'react'

import { useGetEvents } from '../../hooks/useGetEvents'
import type { ItemTemplate } from '../../widgets/List/itemTemplate'
import { ListView } from '../../widgets/List/ListView'

import styles from './Notifications.module.css'

/**
 * Notifications is the events SSE stream rendered through the same `ListView` as
 * the `List`/`EventList` widgets (one presentation, three bindings). Only the
 * Bell badge + Drawer chrome is specific here.
 */
const NOTIFICATION_ITEM_TEMPLATE: ItemTemplate = {
  color: { default: 'gray', map: { Normal: 'blue', Warning: 'orange' }, value: '{type}' },
  formats: { secondaryText: 'datetime' },
  icon: 'fa-bell',
  primaryText: '{reason}',
  secondaryText: '{lastTimestamp|firstTimestamp|metadata.creationTimestamp}',
  subPrimaryText: '{message}',
  subSecondaryText: '{involvedObject.kind}.{involvedObject.apiVersion}/{involvedObject.namespace}/{involvedObject.name}',
}

const Notifications = () => {
  const [drawerVisible, setDrawerVisible] = useState(false)

  const { data: notifications, isLoading } = useGetEvents({ registerToSSE: drawerVisible, topic: 'krateo' })

  return (
    <>
      <Badge
        className={`${styles.badge} ${notifications && notifications?.length > 0 ? styles.hasNotifications : ''}`}
        count={notifications?.length || 0}
      >
        <Button className={styles.icon} icon={<BellFilled />} onClick={() => setDrawerVisible(true)} shape='circle' type='link' />
      </Badge>

      <Drawer className={styles.drawer} onClose={() => setDrawerVisible(false)} open={drawerVisible} title='Notifications' width={550}>
        {isLoading ? <Skeleton active /> : <ListView itemTemplate={NOTIFICATION_ITEM_TEMPLATE} items={notifications ?? []} rowKey='notification' />}
      </Drawer>
    </>
  )
}

export default Notifications
