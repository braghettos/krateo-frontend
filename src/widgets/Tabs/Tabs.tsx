import type { TabsProps } from 'antd'
import { Empty, Result, Tabs as AntdTabs } from 'antd'
import { useMemo } from 'react'

import WidgetRenderer from '../../components/WidgetRenderer'
import type { WidgetProps } from '../../types/Widget'
import { getEndpointUrl } from '../../utils/utils'

import styles from './Tabs.module.css'
import type { Tabs as WidgetType } from './Tabs.type'

export type TabsWidgetData = WidgetType['spec']['widgetData']

const Tabs = ({ resourcesRefs, uid, widgetData }: WidgetProps<TabsWidgetData>) => {
  const { centered, items, size, tabPlacement, type } = widgetData

  const tabItems = useMemo(() => {
    return items.reduce<NonNullable<TabsProps['items']>>((acc, { label, resourceRefId, title }, index) => {
      const endpoint = getEndpointUrl(resourceRefId, resourcesRefs)

      acc.push({
        children: (
          <div className={styles.container}>
            {title && <div className={styles.title}>{title}</div>}
            {endpoint
              ? <WidgetRenderer widgetEndpoint={endpoint} />
              : <Result
                status='error'
                subTitle={`The tab references an invalid resource with resourceRefId: ${resourceRefId}`}
                title={'Error while rendering tab'}
              />
            }
          </div>
        ),
        key: `${uid}-${index}`,
        label,
      })

      return acc
    }, [])
  }, [items, resourcesRefs, uid])

  if (!items.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return <AntdTabs centered={centered} className={styles.tabs} items={tabItems} key={uid} size={size} tabPlacement={tabPlacement} type={type} />
}

export default Tabs
