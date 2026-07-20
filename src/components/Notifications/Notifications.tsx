import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Badge, Button, Drawer, Skeleton } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useGetEvents } from '../../hooks/useGetEvents'
import type { ItemTemplate } from '../../widgets/List/itemTemplate'
import { ListView } from '../../widgets/List/ListView'

import styles from './Notifications.module.css'

/**
 * Notifications is the events SSE stream rendered through the same `ListView` as
 * the `List` widget (one presentation, two bindings). Only the
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

const Notifications = ({ topic = 'krateo' }: { topic?: string } = {}) => {
  const { t } = useTranslation()
  const [drawerVisible, setDrawerVisible] = useState(false)

  const { data: notifications, isLoading } = useGetEvents({ registerToSSE: drawerVisible, topic })

  return (
    <>
      <Badge
        className={styles.badge}
        count={notifications?.length || 0}
      >
        <Button className={styles.icon} icon={<FontAwesomeIcon icon={['fas', 'bell'] as IconProp} />} onClick={() => setDrawerVisible(true)} shape='circle' type='text' />
      </Badge>

      <Drawer className={styles.drawer} onClose={() => setDrawerVisible(false)} open={drawerVisible} title={t('chrome.notifications.title')} width={550}>
        {isLoading ? <Skeleton active /> : <ListView itemTemplate={NOTIFICATION_ITEM_TEMPLATE} items={notifications ?? []} rowKey='notification' />}
      </Drawer>
    </>
  )
}

export default Notifications
