import { Pie } from '@ant-design/plots'
import { Empty } from 'antd'

import { useMeasuredWidth } from '../../hooks/useMeasuredWidth'
import { getColorCode } from '../../theme/palette'
import type { WidgetProps } from '../../types/Widget'

import styles from './PieChart.module.css'
import type { PieChart as WidgetType } from './PieChart.type'

export type PieChartWidgetData = WidgetType['spec']['widgetData']

/**
 * Legend keyed by the `color` channel (driven by `colorField`). Default `bottom`
 * (centered under the donut); `legendPosition: 'right'` stacks it to the right of the
 * donut (the Petrol status-breakdown layout). `justifyContent: center` keeps it aligned
 * with the centered donut on whichever axis the legend runs.
 */
const legendFor = (position: 'bottom' | 'right' | 'top' | 'left' = 'bottom') => ({
  // itemLabelFill = theme ink: G2's default legend text is near-black → invisible on the
  // Petrol void. Resolved per render so it follows the light/dark toggle.
  color: { itemLabelFill: getColorCode('text'), layout: { justifyContent: 'center' }, position },
})

/**
 * Faithful wrapper of the @ant-design/plots `Pie` (AntV G2): data + angle/color
 * field mappings. Colors come from G2's palette via `colorField`, not a Krateo enum.
 * `label` (per-slice value labels) and `annotations` (e.g. a donut center total)
 * are passed straight through to the library.
 */
const PieChart = ({ uid, widgetData }: WidgetProps<PieChartWidgetData>) => {
  // Measure the container width and render the Pie at an explicit size (no autoFit
  // race that scattered the donut on first paint — see useMeasuredWidth).
  const { ref, width } = useMeasuredWidth<HTMLDivElement>()
  const height = widgetData.height ?? 240

  if (!widgetData.data?.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  // Optional semantic slice colors: map each colorField category to a palette color.
  const { colorMap } = widgetData
  const scale = colorMap
    ? { color: { domain: Object.keys(colorMap), range: Object.keys(colorMap).map((key) => getColorCode(colorMap[key])) } }
    : undefined

  return (
    <div className={styles.pieChart} ref={ref} style={{ height }}>
      {width > 0 ? (
        <Pie
          angleField={widgetData.angleField}
          annotations={widgetData.annotations}
          autoFit={false}
          colorField={widgetData.colorField}
          data={widgetData.data}
          height={height}
          innerRadius={widgetData.innerRadius === null || widgetData.innerRadius === undefined ? undefined : widgetData.innerRadius / 100}
          key={uid}
          label={widgetData.label}
          legend={widgetData.legend === false ? false : legendFor(widgetData.legendPosition)}
          scale={scale}
          title={widgetData.title}
          width={width}
        />
      ) : null}
    </div>
  )
}

export default PieChart
