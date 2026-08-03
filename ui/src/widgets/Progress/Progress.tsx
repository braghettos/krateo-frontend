import { Progress as AntdProgress } from 'antd'

import { getColorCode } from '../../theme/palette'
import type { WidgetProps } from '../../types/Widget'

import styles from './Progress.module.css'
import type { Progress as WidgetType } from './Progress.type'

export type ProgressWidgetData = WidgetType['spec']['widgetData']

const Progress = ({ uid, widgetData }: WidgetProps<ProgressWidgetData>) => {
  const { description, label, percent, showInfo, size, status, steps, strokeColor, type } = widgetData
  const strokeHex = strokeColor ? getColorCode(strokeColor) : undefined

  return (
    <div className={styles.progress}>
      <AntdProgress
        key={uid}
        percent={percent}
        showInfo={showInfo}
        size={size}
        status={status}
        steps={steps}
        strokeColor={strokeHex}
        type={type}
      />
      {/* Petrol gauge readout: a strokeColor-tinted primary line (e.g. "Healthy · 100%
          converged") + a muted graphite secondary line (e.g. "all conditions True"),
          stacked under the indicator — mockup `.ring-label` / `.ring-sub`. */}
      {label && <div className={styles.label} style={{ color: strokeHex }}>{label}</div>}
      {description && <div className={styles.description}>{description}</div>}
    </div>
  )
}

export default Progress
