import { Tag as AntdTag } from 'antd'
import type { CSSProperties } from 'react'

import { getTagStyle } from '../../theme/palette'
import type { WidgetProps } from '../../types/Widget'

import type { Tag as WidgetType } from './Tag.type'

export type TagWidgetData = WidgetType['spec']['widgetData']

const Tag = ({ uid, widgetData }: WidgetProps<TagWidgetData>) => {
  // Strip the antd `color` preset and instead resolve it to the EXACT Petrol hex as a
  // soft-tint pill (so a "green"/"gold"/"violet" status Tag is Petrol cyan/amber/magenta,
  // not antd's built-in green/gold/violet). No `color` → a default neutral Tag.
  // MERGE (not replace) the CR's inline `style` over the palette tint, so a Tag can set both
  // a colour AND its own font/size (e.g. the dashboard delta pills' larger numerals) — the
  // earlier replace dropped `style` whenever `color` was set.
  const { color, label, style, ...rest } = widgetData
  const tagStyle = (color ? { ...getTagStyle(color), ...style } : style) as CSSProperties | undefined

  return <AntdTag key={uid} {...rest} style={tagStyle}>{label}</AntdTag>
}

export default Tag
