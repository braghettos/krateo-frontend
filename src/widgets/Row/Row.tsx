import { Col as AntdColumn, Row as AntdRow } from 'antd'

import WidgetRenderer from '../../components/WidgetRenderer'
import type { WidgetProps } from '../../types/Widget'
import { getEndpointUrl } from '../../utils/utils'

import styles from './Row.module.css'
import type { Row as WidgetType } from './Row.type'

export type RowWidgetData = WidgetType['spec']['widgetData']

const justifyContentMap: Record<
  NonNullable<RowWidgetData['items'][number]['alignment']>,
  React.CSSProperties['justifyContent']
> = {
  center: 'center',
  left: 'flex-start',
  right: 'flex-end',
}

const Row = ({ resourcesRefs, uid, widgetData }: WidgetProps<RowWidgetData>) => {
  const { alignment, items } = widgetData

  const defaultSize = Math.floor(24 / items.length) || 24

  return (
    <div className={styles.row}>
      <AntdRow
        align={alignment ?? 'middle'}
        gutter={{ lg: 32, md: 24, sm: 16, xs: 8 }}
        key={uid}
        wrap
      >
        {items
          .map(({ alignment, resourceRefId, size }, index) => {
            const endpoint = getEndpointUrl(resourceRefId, resourcesRefs)
            if (!endpoint) { return null }

            return (
              <AntdColumn
                className={styles.column}
                key={`${uid}-col-${index}`}
                span={size ?? defaultSize}
                style={{
                  display: alignment ? 'flex' : undefined,
                  justifyContent: alignment ? justifyContentMap[alignment] : undefined,
                }}
              >
                <WidgetRenderer key={`${uid}-${index}`} widgetEndpoint={endpoint} />
              </AntdColumn>
            )
          })
          .filter(Boolean)
        }
      </AntdRow>
    </div>
  )
}

export default Row
