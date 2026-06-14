import { Progress as AntdProgress } from 'antd'

import { getColorCode } from '../../theme/palette'
import type { WidgetProps } from '../../types/Widget'

import type { Progress as WidgetType } from './Progress.type'

export type ProgressWidgetData = WidgetType['spec']['widgetData']

const Progress = ({ uid, widgetData }: WidgetProps<ProgressWidgetData>) => {
  const { percent, showInfo, size, status, steps, strokeColor, type } = widgetData

  return (
    <AntdProgress
      key={uid}
      percent={percent}
      showInfo={showInfo}
      size={size}
      status={status}
      steps={steps}
      strokeColor={strokeColor ? getColorCode(strokeColor) : undefined}
      type={type}
    />
  )
}

export default Progress
