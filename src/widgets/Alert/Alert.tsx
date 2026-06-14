import { Alert as AntdAlert } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Alert as WidgetType } from './Alert.type'

export type AlertWidgetData = WidgetType['spec']['widgetData']

const Alert = ({ uid, widgetData }: WidgetProps<AlertWidgetData>) => {
  return <AntdAlert key={uid} {...widgetData} />
}

export default Alert
