import { Badge as AntdBadge } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Badge as WidgetType } from './Badge.type'

export type BadgeWidgetData = WidgetType['spec']['widgetData']

const Badge = ({ uid, widgetData }: WidgetProps<BadgeWidgetData>) => {
  return <AntdBadge key={uid} {...widgetData} />
}

export default Badge
