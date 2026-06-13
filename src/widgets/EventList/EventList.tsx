import type { WidgetProps } from '../../types/Widget'
import type { ItemTemplate } from '../List/itemTemplate'
import List from '../List/List'
import type { ListWidgetData } from '../List/List'

import type { EventList as WidgetType } from './EventList.type'

export type EventListWidgetData = WidgetType['spec']['widgetData']

/**
 * The k8s-event field mapping. EventList is now a thin *preset* of the generic
 * `List` widget: it is "a List of events" — the same presentation, bound to the
 * event shape. New widgets should prefer `List` directly with their own template.
 */
const EVENT_ITEM_TEMPLATE: ItemTemplate = {
  color: { default: 'gray', map: { Normal: 'blue', Warning: 'orange' }, value: '{type}' },
  formats: { secondaryText: 'datetime' },
  icon: 'fa-ellipsis-h',
  primaryText: 'name: {involvedObject.name}  ·  namespace: {involvedObject.namespace}  ·  kind: {involvedObject.kind}  ·  apiVersion: {involvedObject.apiVersion}',
  secondaryText: '{lastTimestamp|firstTimestamp|eventTime}',
  subPrimaryText: '{message}',
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

  return <List resourcesRefs={resourcesRefs} uid={uid} widget={widget} widgetData={listWidgetData} />
}

export default EventList
