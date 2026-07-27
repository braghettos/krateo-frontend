import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Badge, Button, Drawer, Empty, List, Skeleton, Space, Tag, Tooltip, Typography } from 'antd'
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
  const isWarning = event.type === 'Warning'
  const objRef = [event.involvedObject.kind, event.involvedObject.name].filter(Boolean).join('/')

  return (
    <List.Item
      actions={ts
        ? [
            <Tooltip key='ts' title={ts}>
              <Text style={{ fontSize: 11, whiteSpace: 'nowrap' }} type='secondary'>
                {formatTimestamp(ts)}
              </Text>
            </Tooltip>,
          ]
        : []}
    >
      <List.Item.Meta
        avatar={
          <FontAwesomeIcon
            icon={isWarning ? (['fas', 'triangle-exclamation'] as IconProp) : (['fas', 'circle-info'] as IconProp)}
            style={{ color: isWarning ? '#faad14' : '#8c8c8c', fontSize: 16, marginTop: 2 }}
          />
        }
        description={
          <Text style={{ fontSize: 12 }} type='secondary'>
            {event.message ?? ''}
          </Text>
        }
        title={
          <Space size={6}>
            <Tag color={isWarning ? 'warning' : 'default'} style={{ marginRight: 0 }}>
              {event.type ?? 'Unknown'}
            </Tag>
            <Text strong style={{ fontSize: 13 }}>{event.reason ?? ''}</Text>
            {objRef && (
              <Text style={{ fontSize: 11 }} type='secondary'>{objRef}</Text>
            )}
          </Space>
        }
      />
    </List.Item>
  )
}

function sortEvents(events: SSEK8sEvent[]): SSEK8sEvent[] {
  return [...events].sort((a, b) => {
    if (a.type === 'Warning' && b.type !== 'Warning') return -1
    if (a.type !== 'Warning' && b.type === 'Warning') return 1
    const ta = new Date(a.lastTimestamp ?? a.firstTimestamp ?? a.eventTime ?? 0).getTime()
    const tb = new Date(b.lastTimestamp ?? b.firstTimestamp ?? b.eventTime ?? 0).getTime()
    return tb - ta
  })
}

const Notifications = ({ topic = 'krateo' }: { topic?: string } = {}) => {
  const [drawerVisible, setDrawerVisible] = useState(false)
  const { data: notifications, isLoading } = useGetEvents({ registerToSSE: true, topic })
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

  const sorted = notifications ? sortEvents(notifications) : []

  return (
    <>
      <span className={styles.badge}>
        {hasWarning
          ? <Badge dot offset={[-4, 4]} status='warning'>{bellButton}</Badge>
          : bellButton}
      </span>

      <Drawer onClose={() => setDrawerVisible(false)} open={drawerVisible} title='Notifications' width={550}>
        {drawerVisible && (
          isLoading
            ? <Skeleton active paragraph={{ rows: 6 }} />
            : sorted.length > 0
              ? (
                  <List
                    dataSource={sorted}
                    renderItem={event => (
                      <EventItem
                        event={event}
                        key={`${event.metadata.namespace ?? ''}/${event.metadata.name ?? ''}/${event.metadata.uid ?? ''}`}
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
