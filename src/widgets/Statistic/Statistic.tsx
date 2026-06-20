import { Statistic as AntdStatistic } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import styles from './Statistic.module.css'
import type { Statistic as WidgetType } from './Statistic.type'

export type StatisticWidgetData = WidgetType['spec']['widgetData']

const Statistic = ({ uid, widgetData }: WidgetProps<StatisticWidgetData>) => {
  return <AntdStatistic className={styles.statistic} key={uid} {...widgetData} />
}

export default Statistic
