import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Steps as AntdSteps } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import styles from './Steps.module.css'
import type { Steps as WidgetType } from './Steps.type'

export type StepsWidgetData = WidgetType['spec']['widgetData']

const Steps = ({ uid, widgetData }: WidgetProps<StepsWidgetData>) => {
  const { current, items, orientation, size, status, titlePlacement, type } = widgetData

  return (
    <AntdSteps
      className={styles.steps}
      current={current}
      items={items.map(({ description, eyebrow, icon, status: itemStatus, subTitle, title }) => ({
        description,
        icon: icon ? <FontAwesomeIcon icon={icon as IconProp} /> : undefined,
        status: itemStatus,
        subTitle,
        // A per-item "eyebrow" (e.g. "Step 1") renders mono/uppercase ABOVE the title — antd
        // Steps has no above-title slot, so compose the title node ourselves when set.
        title: eyebrow
          ? (
            <span className={styles.titleStack}>
              <span className={styles.eyebrow}>{eyebrow}</span>
              <span>{title}</span>
            </span>
          )
          : title,
      }))}
      key={uid}
      orientation={orientation}
      size={size}
      status={status}
      titlePlacement={titlePlacement}
      type={type}
    />
  )
}

export default Steps
