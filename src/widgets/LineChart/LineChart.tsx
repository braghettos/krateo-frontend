import { Line } from '@ant-design/plots'
import { Empty } from 'antd'

import { useMeasuredWidth } from '../../hooks/useMeasuredWidth'
import type { WidgetProps } from '../../types/Widget'

import styles from './LineChart.module.css'
import type { LineChart as WidgetType } from './LineChart.type'

export type LineChartWidgetData = WidgetType['spec']['widgetData']

/**
 * Gradient area fill rendered beneath the line when `widgetData.area` is true:
 * brand primary at ~0.22 alpha at the top, fading to transparent at the bottom.
 * Passed to G2's `area` option (a composed area mark under the line); the line's
 * own stroke is preserved.
 */
const AREA_FILL = 'linear-gradient(180deg, rgba(99,102,241,0.22) 0%, rgba(99,102,241,0) 100%)'

/**
 * Centered legend below the chart — G2's legend is keyed by the `color` channel
 * (driven by `colorField`). Keeps the series legend centered under the plot.
 */
const CENTERED_LEGEND = { color: { layout: { justifyContent: 'center' }, position: 'bottom' } }

/**
 * Faithful wrapper of the @ant-design/plots `Line` (AntV G2). widgetData maps
 * 1:1 onto the library's config (data + field mappings); colors come from G2's
 * palette via `colorField`, not a Krateo enum.
 */
const LineChart = ({ uid, widgetData }: WidgetProps<LineChartWidgetData>) => {
  // Gate the chart on a measured (>0) container width so autoFit's FIRST paint runs against a real
  // size (no 0/transient-width layout race, e.g. a donut centre off-canvas). After that, autoFit owns
  // sizing: G2's own ResizeObserver re-renders on container resize AND browser zoom (DPR change) at the
  // current pixel ratio — passing a fixed width instead left the canvas locked to its initial size, so
  // a page-zoom shrank the container while the canvas stayed wide and the plot got cropped.
  const { ref, width } = useMeasuredWidth<HTMLDivElement>()
  const height = widgetData.height ?? 300

  if (!widgetData.data?.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div className={styles.lineChart} ref={ref} style={{ height }}>
      {width > 0 ? (
        <Line
          area={widgetData.area ? { style: { fill: AREA_FILL } } : undefined}
          autoFit
          axis={widgetData.axis}
          colorField={widgetData.colorField}
          data={widgetData.data}
          key={uid}
          legend={widgetData.legend === false ? false : CENTERED_LEGEND}
          point={widgetData.point}
          scale={widgetData.scale}
          shapeField={widgetData.shapeField}
          stack={widgetData.stack}
          title={widgetData.title}
          xField={widgetData.xField}
          yField={widgetData.yField}
        />
      ) : null}
    </div>
  )
}

export default LineChart
