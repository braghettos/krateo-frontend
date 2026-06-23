import { Space } from 'antd'

import WidgetRenderer from '../../components/WidgetRenderer'
import type { WidgetProps } from '../../types/Widget'
import { getEndpointUrl } from '../../utils/utils'

import styles from './ButtonGroup.module.css'
import type { ButtonGroup as WidgetType } from './ButtonGroup.type'

export type ButtonGroupWidgetData = WidgetType['spec']['widgetData']

// `alignment` (main-axis justify) has no antd Space prop — kept as a Krateo wrapper concern.
const justifyContentMap: Record<NonNullable<ButtonGroupWidgetData['alignment']>, React.CSSProperties['justifyContent']> = {
  center: 'center',
  left: 'flex-start',
  right: 'flex-end',
}

const ButtonGroup = ({ resourcesRefs, uid, widgetData }: WidgetProps<ButtonGroupWidgetData>) => {
  const { alignment, items, orientation, size, wrap } = widgetData
  const spaceSize = size ?? 'small'

  return (
    <div className={styles.inlineGroup} key={uid} style={{ justifyContent: justifyContentMap[alignment ?? 'left'] }}>
      <Space orientation={orientation} size={spaceSize} wrap={wrap}>
        {items
          .map(({ resourceRefId }, index) => {
            const endpoint = getEndpointUrl(resourceRefId, resourcesRefs)
            if (!endpoint) {
              return null
            }

            return <WidgetRenderer key={`${uid}-${index}`} widgetEndpoint={endpoint} />
          })
          .filter(Boolean)}
      </Space>
    </div>
  )
}

export default ButtonGroup
