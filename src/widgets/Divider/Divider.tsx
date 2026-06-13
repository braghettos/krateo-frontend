import { Divider as AntdDivider } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Divider as WidgetType } from './Divider.type'

export type DividerWidgetData = WidgetType['spec']['widgetData']

const Divider = ({ uid, widgetData }: WidgetProps<DividerWidgetData>) => {
  const { label, ...rest } = widgetData

  return <AntdDivider key={uid} {...rest}>{label}</AntdDivider>
}

export default Divider
