import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Steps as AntdSteps } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Steps as WidgetType } from './Steps.type'

export type StepsWidgetData = WidgetType['spec']['widgetData']

const Steps = ({ uid, widgetData }: WidgetProps<StepsWidgetData>) => {
  const { current, direction, items, labelPlacement, size, status, type } = widgetData

  return (
    <AntdSteps
      current={current}
      direction={direction}
      items={items.map(({ description, icon, status: itemStatus, subTitle, title }) => ({
        description,
        icon: icon ? <FontAwesomeIcon icon={icon as IconProp} /> : undefined,
        status: itemStatus,
        subTitle,
        title,
      }))}
      key={uid}
      labelPlacement={labelPlacement}
      size={size}
      status={status}
      type={type}
    />
  )
}

export default Steps
