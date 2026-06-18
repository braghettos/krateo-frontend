import { Descriptions as AntdDescriptions } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Descriptions as WidgetType } from './Descriptions.type'

export type DescriptionsWidgetData = WidgetType['spec']['widgetData']

const Descriptions = ({ uid, widgetData }: WidgetProps<DescriptionsWidgetData>) => {
  const { bordered, column, items, size, title } = widgetData

  return (
    <AntdDescriptions
      bordered={bordered}
      column={column}
      items={items.map(({ label, span, value }, index) => ({
        children: value,
        key: String(index),
        label,
        span,
      }))}
      key={uid}
      size={size}
      title={title}
    />
  )
}

export default Descriptions
