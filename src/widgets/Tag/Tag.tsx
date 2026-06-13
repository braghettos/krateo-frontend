import { Tag as AntdTag } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Tag as WidgetType } from './Tag.type'

export type TagWidgetData = WidgetType['spec']['widgetData']

const Tag = ({ uid, widgetData }: WidgetProps<TagWidgetData>) => {
  const { label, ...rest } = widgetData

  return <AntdTag key={uid} {...rest}>{label}</AntdTag>
}

export default Tag
