import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Steps as AntdSteps } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Steps as WidgetType } from './Steps.type'

export type StepsWidgetData = WidgetType['spec']['widgetData']

const Steps = ({ uid, widgetData }: WidgetProps<StepsWidgetData>) => {
  const { current, items, orientation, size, status, titlePlacement, type } = widgetData

  return (
    <AntdSteps
      current={current}
      items={items.map(({ description, icon, status: itemStatus, subTitle, title }) => ({
        description,
        icon: icon ? <FontAwesomeIcon icon={icon as IconProp} /> : undefined,
        status: itemStatus,
        subTitle,
        title,
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
