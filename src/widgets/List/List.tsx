import { useMemo } from 'react'

import { useFilter } from '../../components/FiltesProvider/FiltersProvider'
import { WidgetLoading } from '../../components/WidgetStates'
import { useSseStream } from '../../hooks/useSseStream'
import type { WidgetProps } from '../../types/Widget'

import type { ItemTemplate } from './itemTemplate'
import type { List as WidgetType } from './List.type'
import { ListView } from './ListView'

export type ListWidgetData = WidgetType['spec']['widgetData']

const List = ({ uid, widgetData }: WidgetProps<ListWidgetData>) => {
  const { itemTemplate, items, maxItems, prefix, sseEndpoint, sseTopic } = widgetData

  const { getFilteredData } = useFilter()
  const streaming = !!sseEndpoint && !!sseTopic

  const { connecting, items: streamed } = useSseStream<unknown>({
    endpoint: sseEndpoint,
    initial: items ?? [],
    max: maxItems ?? 200,
    topic: sseTopic,
  })

  const data = useMemo(() => (streaming ? streamed : (items ?? [])), [streaming, streamed, items])

  const filtered = useMemo(
    () => (prefix && data.length ? (getFilteredData(data as Record<string, unknown>[], prefix) as unknown[]) : data),
    [prefix, data, getFilteredData]
  )

  if (connecting) {
    return <WidgetLoading />
  }

  return <ListView itemTemplate={itemTemplate as ItemTemplate} items={filtered} rowKey={uid} />
}

export default List
