import { Col as AntdCol } from 'antd'

import WidgetRenderer from '../../components/WidgetRenderer'
import type { WidgetProps } from '../../types/Widget'
import { getEndpointUrl } from '../../utils/utils'

import styles from './Col.module.css'
import type { Col as WidgetType } from './Col.type'

export type ColWidgetData = WidgetType['spec']['widgetData']

const Col = ({ resourcesRefs, uid, widgetData }: WidgetProps<ColWidgetData>) => {
  const { items, size } = widgetData

  if (size === 0) {
    return null
  }

  return (
    <AntdCol className={styles.column} key={uid} span={size}>
      {items
        .map(({ resourceRefId }, index) => {
          const endpoint = getEndpointUrl(resourceRefId, resourcesRefs)
          if (!endpoint) {
            return null
          }

          return <WidgetRenderer key={`${uid}-${index}`} widgetEndpoint={endpoint} />
        })
        .filter(Boolean)}
    </AntdCol>
  )
}

export default Col
