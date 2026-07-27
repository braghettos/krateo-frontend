import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Badge, Button, Drawer, Empty, List, Skeleton, Tag, Tooltip, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'

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

interface DedupedEvent {
  count: number
  event: SSEK8sEvent
}

function dedupeEvents(events: SSEK8sEvent[]): DedupedEvent[] {
  const groups = new Map<string, DedupedEvent>()
  for (const event of events) {
    const key = [
      event.type ?? '',
      event.reason ?? '',
      event.involvedObject.kind ?? '',
      event.involvedObject.name ?? '',
    ].join('\0')
    const existing = groups.get(key)
    if (existing) {
      existing.count++
      const ta = new Date(existing.event.lastTimestamp ?? existing.event.firstTimestamp ?? existing.event.eventTime ?? 0).getTime()
      const tb = new Date(event.lastTimestamp ?? event.firstTimestamp ?? event.eventTime ?? 0).getTime()
      if (tb > ta) existing.event = event
    } else {
      groups.set(key, { count: 1, event })
    }
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.event.type === 'Warning' && b.event.type !== 'Warning') return -1
    if (a.event.type !== 'Warning' && b.event.type === 'Warning') return 1
    const ta = new Date(a.event.lastTimestamp ?? a.event.firstTimestamp ?? a.event.eventTime ?? 0).getTime()
    const tb = new Date(b.event.lastTimestamp ?? b.event.firstTimestamp ?? b.event.eventTime ?? 0).getTime()
    return tb - ta
  })
}

function toResourceUrl(event: SSEK8sEvent): string | null {
  const obj = event.involvedObject
  if (!obj.kind || !obj.name) return null
  const ns = obj.namespace || 'cluster'
  const apiVer = obj.apiVersion ?? 'v1'
  let group = ''
  let version = apiVer
  if (apiVer.includes('/')) {
    const idx = apiVer.indexOf('/')
    group = apiVer.slice(0, idx)
    version = apiVer.slice(idx + 1)
  }
  const plural = obj.kind.toLowerCase() + 's'
  return `/resources/${ns}/${group}/${version}/${plural}/${obj.name}`
}

function EventItem({ deduped, onNavigate }: { deduped: DedupedEvent; onNavigate: (url: string) => void }) {
  const { count, event } = deduped
  const ts = event.lastTimestamp ?? event.firstTimestamp ?? event.eventTime
  const isWarning = event.type === 'Warning'
  const objRef = [event.involvedObject.kind, event.involvedObject.name].filter(Boolean).join('/')
  const resourceUrl = toResourceUrl(event)

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
      onClick={resourceUrl ? () => onNavigate(resourceUrl) : undefined}
      style={resourceUrl ? { cursor: 'pointer' } : undefined}
    >
      <List.Item.Meta
        avatar={
          <FontAwesomeIcon
            icon={isWarning ? (['fas', 'triangle-exclamation'] as IconProp) : (['fas', 'circle-info'] as IconProp)}
            style={{ color: isWarning ? '#faad14' : '#8c8c8c', fontSize: 16, marginTop: 2 }}
          />
        }
        description={<Text style={{ fontSize: 12 }} type='secondary'>{event.message ?? ''}</Text>}
        title={
          <div style={{ alignItems: 'center', display: 'flex', gap: 6, minWidth: 0, overflow: 'hidden' }}>
            <Tag color={isWarning ? 'warning' : 'default'} style={{ flexShrink: 0, margin: 0 }}>
              {event.type ?? 'Unknown'}
            </Tag>
            <Text strong style={{ flex: 1, fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {event.reason ?? ''}
            </Text>
            {count > 1 && (
              <Tag style={{ flexShrink: 0, margin: 0 }}>×{count}</Tag>
            )}
            {objRef && (
              <Text style={{ flexShrink: 1, fontSize: 11, maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} type='secondary'>
                {objRef}
              </Text>
            )}
          </div>
        }
      />
    </List.Item>
  )
}

const Notifications = ({ topic = 'krateo' }: { topic?: string } = {}) => {
  const [drawerVisible, setDrawerVisible] = useState(false)
  const { data: notifications, isLoading } = useGetEvents({ registerToSSE: true, topic })
  const navigate = useNavigate()

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

  const deduped = notifications ? dedupeEvents(notifications) : []

  const handleNavigate = (url: string) => {
    setDrawerVisible(false)
    navigate(url)
  }

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
            : deduped.length > 0
              ? (
                  <List
                    dataSource={deduped}
                    renderItem={item => (
                      <EventItem
                        deduped={item}
                        key={`${item.event.involvedObject.kind ?? ''}/${item.event.involvedObject.name ?? ''}/${item.event.reason ?? ''}`}
                        onNavigate={handleNavigate}
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
