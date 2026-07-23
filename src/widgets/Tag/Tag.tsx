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
  const palette = color ? getTagStyle(color) : undefined
  const tagStyle = (palette ? { ...palette, ...style } : style) as CSSProperties | undefined

  // Leading status dot — mirrors the honest mockup's `.tag::before` (a 6px ink dot on
  // status/category pills). Show it ONLY for coloured pills that DON'T set their own
  // fontSize: the sized delta pills ("5 new", "96%") carry a number, not a status, so a
  // dot there would be noise. The dot inherits the palette's ink colour.
  const showDot = !!palette && !(style as CSSProperties | undefined)?.fontSize

  return (
    <AntdTag key={uid} {...rest} style={tagStyle}>
      {showDot && (
        <span
          style={{
            background: palette?.color,
            borderRadius: '50%',
            display: 'inline-block',
            height: 6,
            marginRight: 6,
            verticalAlign: 'middle',
            width: 6,
          }}
        />
      )}
      {label}
    </AntdTag>
  )
}

export default Tag
