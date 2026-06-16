import { Pie } from '@ant-design/plots'
import { Empty } from 'antd'

import { getColorCode } from '../../theme/palette'
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

  // Optional semantic slice colors: map each colorField category to a palette color.
  const { colorMap } = widgetData
  const scale = colorMap
    ? { color: { domain: Object.keys(colorMap), range: Object.keys(colorMap).map((key) => getColorCode(colorMap[key])) } }
    : undefined

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
        scale={scale}
        title={widgetData.title}
      />
    </div>
  )
}

export default PieChart
