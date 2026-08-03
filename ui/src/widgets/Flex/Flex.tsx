import { Flex as AntdFlex } from 'antd'

import WidgetRenderer from '../../components/WidgetRenderer'
import type { WidgetProps } from '../../types/Widget'
import { getEndpointUrl } from '../../utils/utils'

import type { Flex as WidgetType } from './Flex.type'

export type FlexWidgetData = WidgetType['spec']['widgetData']

const Flex = ({ resourcesRefs, uid, widgetData }: WidgetProps<FlexWidgetData>) => {
  const { align, gap, items, justify, vertical, wrap } = widgetData

  return (
    <AntdFlex align={align} gap={gap} justify={justify} key={uid} vertical={vertical} wrap={wrap}>
      {items
        .map(({ resourceRefId }, index) => {
          const endpoint = getEndpointUrl(resourceRefId, resourcesRefs)
          if (!endpoint) {
            return null
          }

          return <WidgetRenderer key={`${uid}-${index}`} widgetEndpoint={endpoint} />
        })
        .filter(Boolean)}
    </AntdFlex>
  )
}

export default Flex
