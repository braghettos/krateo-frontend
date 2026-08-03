import { Col as AntdCol } from 'antd'

import WidgetRenderer from '../../components/WidgetRenderer'
import type { WidgetProps } from '../../types/Widget'
import { getEndpointUrl } from '../../utils/utils'

import styles from './Col.module.css'
import type { Col as WidgetType } from './Col.type'

export type ColWidgetData = WidgetType['spec']['widgetData']

const Col = ({ resourcesRefs, uid, widgetData }: WidgetProps<ColWidgetData>) => {
  const { flex, items, lg, md, offset, order, sm, span, xl, xs, xxl } = widgetData
  // antd `span`, with back-compat for the legacy `size`.
  const colSpan = span ?? (widgetData as { size?: number }).size

  if (colSpan === 0) {
    return null
  }

  return (
    <AntdCol className={styles.column} flex={flex} key={uid} lg={lg} md={md} offset={offset} order={order} sm={sm} span={colSpan} xl={xl} xs={xs} xxl={xxl}>
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
