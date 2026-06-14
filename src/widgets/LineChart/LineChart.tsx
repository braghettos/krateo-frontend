import { Line } from '@ant-design/plots'
import { Empty } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import styles from './LineChart.module.css'
import type { LineChart as WidgetType } from './LineChart.type'

export type LineChartWidgetData = WidgetType['spec']['widgetData']

/**
 * Faithful wrapper of the @ant-design/plots `Line` (AntV G2). widgetData maps
 * 1:1 onto the library's config (data + field mappings); colors come from G2's
 * palette via `colorField`, not a Krateo enum.
 */
const LineChart = ({ uid, widgetData }: WidgetProps<LineChartWidgetData>) => {
  if (!widgetData.data?.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div className={styles.lineChart}>
      <Line
        autoFit
        colorField={widgetData.colorField}
        data={widgetData.data}
        height={widgetData.height}
        key={uid}
        legend={widgetData.legend === false ? false : undefined}
        shapeField={widgetData.shapeField}
        stack={widgetData.stack}
        title={widgetData.title}
        xField={widgetData.xField}
        yField={widgetData.yField}
      />
    </div>
  )
}

export default LineChart
