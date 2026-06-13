import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Avatar, List as AntdList, Typography } from 'antd'
import type { ListGridType } from 'antd/es/list'
import type { ReactNode } from 'react'

import { WidgetEmpty } from '../../components/WidgetStates'
import { getColorCode } from '../../theme/palette'

import { resolveRow, type ItemTemplate } from './itemTemplate'
import styles from './ListView.module.css'

interface ListViewProps {
  items: unknown[]
  rowKey: string
  /** Maps a data element to a row (the serializable substitute for antd renderItem). */
  itemTemplate?: ItemTemplate
  /** Renders an element as a child widget (used when the element carries a resourceRefId). */
  renderChild?: (item: unknown, index: number) => ReactNode | null
  // antd List props (verbatim)
  grid?: ListGridType
  itemLayout?: 'horizontal' | 'vertical'
  size?: 'default' | 'large' | 'small'
  bordered?: boolean
  split?: boolean
  loading?: boolean
  header?: ReactNode
  footer?: ReactNode
}

/**
 * Domain-agnostic list presentation mirroring the antd `List` API. Each element
 * is rendered as a child widget (when `renderChild` returns a node for it) or as
 * an `List.Item.Meta` row via `itemTemplate`. Shared by the `List` widget, the
 * `EventList` preset and `Notifications`.
 */
export const ListView = ({
  bordered, footer, grid, header, itemLayout = 'horizontal', itemTemplate, items, loading, renderChild, rowKey, size, split,
}: ListViewProps) => {
  if (!loading && !items.length) {
    return <WidgetEmpty />
  }

  return (
    <AntdList
      bordered={bordered}
      dataSource={items}
      footer={footer}
      grid={grid}
      header={header}
      itemLayout={itemLayout}
      loading={loading}
      renderItem={(item, index) => {
        const child = renderChild?.(item, index)
        if (child) {
          return <AntdList.Item key={`${rowKey}-${index}`}>{child}</AntdList.Item>
        }

        if (!itemTemplate) { return null }

        const row = resolveRow(itemTemplate, item)
        return (
          <AntdList.Item
            extra={
              (row.secondaryText || row.subSecondaryText)
                ? (
                  <div className={styles.extra}>
                    {row.subSecondaryText && <Typography.Text type='secondary'>{row.subSecondaryText}</Typography.Text>}
                    {row.secondaryText && <Typography.Text>{row.secondaryText}</Typography.Text>}
                  </div>
                )
                : undefined
            }
            key={`${rowKey}-${index}`}
          >
            <AntdList.Item.Meta
              avatar={row.icon ? <Avatar icon={<FontAwesomeIcon icon={row.icon as IconProp} />} style={{ backgroundColor: getColorCode(row.color) }} /> : undefined}
              description={row.subPrimaryText || undefined}
              title={row.primaryText}
            />
          </AntdList.Item>
        )
      }}
      size={size}
      split={split}
    />
  )
}
