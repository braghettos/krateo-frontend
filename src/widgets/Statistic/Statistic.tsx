import { Statistic as AntdStatistic } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Statistic as WidgetType } from './Statistic.type'

export type StatisticWidgetData = WidgetType['spec']['widgetData']

const Statistic = ({ uid, widgetData }: WidgetProps<StatisticWidgetData>) => {
  return <AntdStatistic key={uid} {...widgetData} />
}

export default Statistic
