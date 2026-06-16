import WidgetRenderer from '../../components/WidgetRenderer'
import type { WidgetProps } from '../../types/Widget'
import { getEndpointUrl } from '../../utils/utils'

import styles from './Page.module.css'
import type { Page as WidgetType } from './Page.type'

export type PageWidgetData = WidgetType['spec']['widgetData']

export function Page({ resourcesRefs, uid, widgetData }: WidgetProps<PageWidgetData>) {
  const { items } = widgetData

  return (
    <div className={styles.page} key={uid}>
      {items
        .map(({ resourceRefId }, index) => {
          const endpoint = getEndpointUrl(resourceRefId, resourcesRefs)
          if (!endpoint) { return null }

          return <WidgetRenderer key={`${uid}-${index}`} widgetEndpoint={endpoint} />
        })
        .filter(Boolean)
      }
    </div>
  )
}
