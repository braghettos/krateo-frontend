import { Pie } from '@ant-design/plots'
import { Empty } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import styles from './PieChart.module.css'
import type { PieChart as WidgetType } from './PieChart.type'

export type PieChartWidgetData = WidgetType['spec']['widgetData']

/**
 * Faithful wrapper of the @ant-design/plots `Pie` (AntV G2): data + angle/color
 * field mappings. Colors come from G2's palette via `colorField`, not a Krateo enum.
 */
const PieChart = ({ uid, widgetData }: WidgetProps<PieChartWidgetData>) => {
  if (!widgetData.data?.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div className={styles.pieChart}>
      <Pie
        angleField={widgetData.angleField}
        autoFit
        colorField={widgetData.colorField}
        data={widgetData.data}
        height={widgetData.height}
        innerRadius={widgetData.innerRadius === null || widgetData.innerRadius === undefined ? undefined : widgetData.innerRadius / 100}
        key={uid}
        legend={widgetData.legend === false ? false : undefined}
        title={widgetData.title}
      />
    </div>
  )
}

export default PieChart
