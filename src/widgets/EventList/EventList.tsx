import { Badge } from 'antd'

import type { WidgetProps } from '../../types/Widget'
import type { ItemTemplate } from '../List/itemTemplate'
import List from '../List/List'
import type { ListWidgetData } from '../List/List'

import styles from './EventList.module.css'
import type { EventList as WidgetType } from './EventList.type'

export type EventListWidgetData = WidgetType['spec']['widgetData']

/**
 * The k8s-event field mapping. EventList is now a thin *preset* of the generic
 * `List` widget: it is "a List of events" — the same presentation, bound to the
 * event shape. New widgets should prefer `List` directly with their own template.
 */
const EVENT_ITEM_TEMPLATE: ItemTemplate = {
  color: { default: 'gray', map: { Normal: 'blue', Warning: 'orange' }, value: '{type}' },
  formats: { secondaryText: 'relative' },
  iconVariant: 'dot',
  primaryText: '{message}',
  secondaryText: '{lastTimestamp|firstTimestamp|eventTime}',
  subPrimaryText: '{involvedObject.kind}  ·  {involvedObject.namespace}',
  subSecondaryText: '{reason}',
}

const EventList = ({ resourcesRefs, uid, widget, widgetData }: WidgetProps<EventListWidgetData>) => {
  const { events, prefix, sseEndpoint, sseTopic } = widgetData

  const listWidgetData = {
    dataSource: events ?? [],
    itemTemplate: EVENT_ITEM_TEMPLATE,
    maxItems: 200,
    prefix,
    sseEndpoint,
    sseTopic,
  } satisfies ListWidgetData

  return (
    <div className={styles.eventList}>
      {/* "Live" indicator when the list is SSE-backed (live-refresh) — mirrors the
          mockup's Live badge on the events card. */}
      {sseEndpoint ? (
        <div className={styles.live}>
          <Badge status='processing' text='Live' />
        </div>
      ) : null}
      <List resourcesRefs={resourcesRefs} uid={uid} widget={widget} widgetData={listWidgetData} />
    </div>
  )
}

export default EventList
