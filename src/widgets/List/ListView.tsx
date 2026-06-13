import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Avatar, List as AntdList, Typography } from 'antd'

import { WidgetEmpty } from '../../components/WidgetStates'
import { getColorCode } from '../../theme/palette'

import { resolveRow, type ItemTemplate } from './itemTemplate'
import styles from './ListView.module.css'

/**
 * Domain-agnostic list presentation: renders any array of items as antd
 * `List.Item.Meta` rows, mapping each item through `itemTemplate`. Shared by the
 * `List` widget, the `EventList` preset, and `Notifications` — so "a list of
 * events" is just one binding of "a list of anything".
 */
export const ListView = ({ itemTemplate, items, rowKey }: { items: unknown[]; itemTemplate: ItemTemplate; rowKey: string }) => {
  if (!items.length) {
    return <WidgetEmpty />
  }

  return (
    <AntdList
      dataSource={items}
      itemLayout='horizontal'
      renderItem={(item, index) => {
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
    />
  )
}
