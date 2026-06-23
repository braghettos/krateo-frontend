import { Image as AntdImage } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Image as WidgetType } from './Image.type'

export type ImageWidgetData = WidgetType['spec']['widgetData']

/** Faithful wrapper of the antd `Image` component — every widgetData key is an
 * antd Image prop, spread straight through. */
const Image = ({ uid, widgetData }: WidgetProps<ImageWidgetData>) => {
  return <AntdImage key={uid} {...widgetData}/>
}

export default Image
