import { Result as AntdResult } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Result as WidgetType } from './Result.type'

export type ResultWidgetData = WidgetType['spec']['widgetData']

const Result = ({ uid, widgetData }: WidgetProps<ResultWidgetData>) => {
  return <AntdResult key={uid} {...widgetData} />
}

export default Result
