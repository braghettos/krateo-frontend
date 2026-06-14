import { Column } from '@ant-design/plots'
import { Empty } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import styles from './BarChart.module.css'
import type { BarChart as WidgetType } from './BarChart.type'

export type BarChartWidgetData = WidgetType['spec']['widgetData']

/**
 * Faithful wrapper of the @ant-design/charts `Column` (AntV G2 — vertical bars):
 * data + field mappings. Replaces the previous fake (stacked antd `Progress`
 * with a `percentage`-only schema).
 */
const BarChart = ({ uid, widgetData }: WidgetProps<BarChartWidgetData>) => {
  if (!widgetData.data?.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div className={styles.chart}>
      <Column
        autoFit
        colorField={widgetData.colorField}
        data={widgetData.data}
        group={widgetData.group}
        height={widgetData.height}
        key={uid}
        legend={widgetData.legend === false ? false : undefined}
        stack={widgetData.stack}
        title={widgetData.title}
        xField={widgetData.xField}
        yField={widgetData.yField}
      />
    </div>
  )
}

export default BarChart
