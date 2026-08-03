import { FlowGraph, G6 } from '@ant-design/graphs'
import { ReactNode as G6ReactNode } from '@antv/g6-extension-react'
import { Empty } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import styles from './FlowChart.module.css'
import type { FlowChart as WidgetType } from './FlowChart.type'
import FlowChartNodeElement from './FlowChartNodeElement'
import { toGraphData } from './utils'

export type FlowChartWidgetData = WidgetType['spec']['widgetData']
export type FlowChartData = FlowChartWidgetData['data']
export type FlowChartNodeData = NonNullable<FlowChartData>[number]

// Register the React custom-node type once so antd components render as G6 nodes.
try {
  G6.register(G6.ExtensionCategory.NODE, 'react', G6ReactNode)
} catch {
  /* already registered */
}

const FlowChart = ({ uid, widgetData }: WidgetProps<FlowChartWidgetData>) => {
  const { data } = widgetData
  const graphData = toGraphData(data)

  if (!data || graphData.nodes.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div className={styles.flowChart} key={uid}>
      <FlowGraph
        autoFit='view'
        behaviors={['drag-canvas', 'zoom-canvas']}
        data={graphData}
        layout={{ nodesep: 24, rankdir: 'LR', ranksep: 60, type: 'dagre' }}
        node={{
          style: {
            component: (datum: { data: FlowChartNodeData }) => <FlowChartNodeElement data={datum.data} />,
            ports: [{ placement: 'left' }, { placement: 'right' }],
            size: [300, 140],
          },
          type: 'react',
        }}
      />
    </div>
  )
}

export default FlowChart
