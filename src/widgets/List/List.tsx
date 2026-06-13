import { useMemo } from 'react'

import { useFilter } from '../../components/FiltesProvider/FiltersProvider'
import WidgetRenderer from '../../components/WidgetRenderer'
import { WidgetLoading } from '../../components/WidgetStates'
import { useSseStream } from '../../hooks/useSseStream'
import type { WidgetProps } from '../../types/Widget'
import { getEndpointUrl } from '../../utils/utils'

import type { ItemTemplate } from './itemTemplate'
import type { List as WidgetType } from './List.type'
import { ListView } from './ListView'

export type ListWidgetData = WidgetType['spec']['widgetData']

const hasResourceRef = (item: unknown): item is { resourceRefId: string } =>
  !!item && typeof item === 'object' && typeof (item as { resourceRefId?: unknown }).resourceRefId === 'string'

const List = ({ resourcesRefs, uid, widgetData }: WidgetProps<ListWidgetData>) => {
  const { bordered, footer, grid, header, itemLayout, itemTemplate, loading, maxItems, prefix, size, split, sseEndpoint, sseTopic } = widgetData

  // `dataSource` is the antd-faithful field; `items` is accepted for back-compat with legacy DataGrid CRs.
  const dataSource = useMemo(
    () => widgetData.dataSource ?? (widgetData as { items?: unknown[] }).items ?? [],
    [widgetData]
  )

  const { getFilteredData } = useFilter()
  const streaming = !!sseEndpoint && !!sseTopic

  const { connecting, items: streamed } = useSseStream<unknown>({
    endpoint: sseEndpoint,
    initial: dataSource,
    max: maxItems ?? 200,
    topic: sseTopic,
  })

  const data = useMemo(() => (streaming ? streamed : dataSource), [streaming, streamed, dataSource])

  // child-widget items filter themselves (prefix is forwarded to their WidgetRenderer);
  // only data-mode items are filtered here.
  const childMode = useMemo(() => data.some(hasResourceRef), [data])
  const filtered = useMemo(
    () => (!childMode && prefix && data.length ? (getFilteredData(data as Record<string, unknown>[], prefix) as unknown[]) : data),
    [childMode, prefix, data, getFilteredData]
  )

  const renderChild = (item: unknown) => {
    if (!hasResourceRef(item)) { return null }
    const endpoint = getEndpointUrl(item.resourceRefId, resourcesRefs)
    return endpoint ? <WidgetRenderer prefix={prefix} widgetEndpoint={endpoint} /> : null
  }

  if (connecting) {
    return <WidgetLoading />
  }

  return (
    <ListView
      bordered={bordered}
      footer={footer}
      grid={grid}
      header={header}
      itemLayout={itemLayout}
      itemTemplate={itemTemplate as ItemTemplate | undefined}
      items={filtered}
      loading={loading}
      renderChild={renderChild}
      rowKey={uid}
      size={size}
      split={split}
    />
  )
}

export default List
