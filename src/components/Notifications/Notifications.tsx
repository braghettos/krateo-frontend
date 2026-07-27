import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Badge, Button, Drawer, Empty, List, Tag, Tooltip, Typography } from 'antd'
import { useState } from 'react'

import { useGetEvents } from '../../hooks/useGetEvents'
import type { SSEK8sEvent } from '../../utils/types'

import styles from './Notifications.module.css'

const { Text } = Typography

function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function EventItem({ event }: { event: SSEK8sEvent }) {
  const ts = event.lastTimestamp ?? event.firstTimestamp ?? event.eventTime
  const objRef = [event.involvedObject.kind, event.involvedObject.name].filter(Boolean).join('/')
  const isWarning = event.type === 'Warning'

  return (
    <List.Item>
      <List.Item.Meta
        avatar={
          <Tag color={isWarning ? 'warning' : 'default'} style={{ marginTop: 2 }}>
            {event.type ?? 'Unknown'}
          </Tag>
        }
        description={
          <Text style={{ fontSize: 12 }} type='secondary'>
            {event.message ?? ''}
          </Text>
        }
        title={
          <span>
            <Text strong style={{ marginRight: 8 }}>{event.reason ?? ''}</Text>
            {objRef && <Text style={{ fontSize: 12 }} type='secondary'>{objRef}</Text>}
          </span>
        }
      />
      {ts && (
        <Tooltip title={ts}>
          <Text style={{ fontSize: 11, whiteSpace: 'nowrap' }} type='secondary'>
            {formatTimestamp(ts)}
          </Text>
        </Tooltip>
      )}
    </List.Item>
  )
}

const Notifications = ({ topic = 'krateo' }: { topic?: string } = {}) => {
  const [drawerVisible, setDrawerVisible] = useState(false)
  const { data: notifications } = useGetEvents({ registerToSSE: true, topic })
  const hasWarning = (notifications ?? []).some(n => n.type === 'Warning')

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
        {drawerVisible && (
          notifications && notifications.length > 0
            ? (
                <List
                  dataSource={notifications}
                  renderItem={event => (
                    <EventItem
                      event={event}
                      key={event.metadata.uid ?? event.metadata.name ?? ''}
                    />
                  )}
                  size='small'
                  split
                />
              )
            : <Empty description='No events' image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Drawer>
    </>
  )
}

export default Notifications
