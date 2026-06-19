import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Avatar, List as AntdList, Button, Dropdown, Tag, Typography } from 'antd'
import useApp from 'antd/es/app/useApp'
import type { ListGridType } from 'antd/es/list'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { WidgetEmpty } from '../../components/WidgetStates'
import { useHandleAction } from '../../hooks/useHandleActions'
import { getColorCode } from '../../theme/palette'
import type { ResourcesRefs, Widget, WidgetAction, WidgetActions } from '../../types/Widget'

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
  /** The widget's action map (widgetData.actions); per-row `rowActions` reference ids in it. */
  actions?: WidgetActions
  /** The widget's resource refs, handed to useHandleAction when a row action fires. */
  resourcesRefs?: ResourcesRefs
  /** The full widget — jq context for action handling. */
  widget?: Widget
}

/**
 * Domain-agnostic list presentation mirroring the antd `List` API. Each element
 * is rendered as a child widget (when `renderChild` returns a node for it) or as
 * an `List.Item.Meta` row via `itemTemplate`. Shared by the `List` widget, the
 * `EventList` preset and `Notifications`.
 */
export const ListView = ({
  actions, bordered, footer, grid, header, itemLayout = 'horizontal', itemTemplate, items, loading, renderChild, resourcesRefs, rowKey, size, split, widget,
}: ListViewProps) => {
  const navigate = useNavigate()
  const { notification } = useApp()
  const { handleAction } = useHandleAction()

  // Fire a per-row action: look it up by id in the shared action map and dispatch it with
  // the row's data as customPayload (so one action definition serves every row).
  const fireRowAction = async (actionId: string, item: unknown) => {
    const allActions = (actions ? Object.values(actions).flat() : []) as WidgetAction[]
    const action = allActions.find((candidate) => candidate.id === actionId)
    if (!action) {
      notification.error({
        description: `The list does not define an action (ID: ${actionId})`,
        message: 'Error while executing the action',
        placement: 'bottomLeft',
      })
      return
    }
    await handleAction(action, resourcesRefs ?? { items: [] }, item as Record<string, unknown>, widget)
  }

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
          // Child-widget items (e.g. marketplace blueprint cards) become clickable
          // when the data element carries a `navigateTo` (whole-card → SPA route).
          const childNav = item && typeof item === 'object' ? (item as { navigateTo?: unknown }).navigateTo : undefined
          const navPath = typeof childNav === 'string' && childNav ? childNav : undefined
          return (
            <AntdList.Item
              className={navPath ? styles.clickable : undefined}
              key={`${rowKey}-${index}`}
              onClick={navPath ? () => { void navigate(navPath) } : undefined}
            >
              {child}
            </AntdList.Item>
          )
        }

        if (!itemTemplate) { return null }

        const row = resolveRow(itemTemplate, item)
        const colorCode = getColorCode(row.color)
        const soft = `color-mix(in srgb, ${colorCode} 14%, var(--light-color))`

        let avatar: ReactNode
        if (itemTemplate.iconVariant === 'dot') {
          avatar = <span className={styles.dot} style={{ backgroundColor: colorCode, boxShadow: `0 0 0 3px ${soft}` }} />
        } else if (itemTemplate.iconVariant === 'tile' && row.icon) {
          avatar = <span className={styles.tile} style={{ backgroundColor: soft, color: colorCode }}><FontAwesomeIcon icon={row.icon as IconProp} /></span>
        } else if (row.icon) {
          avatar = <Avatar icon={<FontAwesomeIcon icon={row.icon as IconProp} />} style={{ backgroundColor: colorCode }} />
        }

        const rowActions = itemTemplate.rowActions ?? []
        const kebab = rowActions.length
          ? (
            <Dropdown
              key='row-actions'
              menu={{
                items: rowActions.map((rowAction) => ({
                  danger: rowAction.danger,
                  icon: rowAction.icon ? <FontAwesomeIcon icon={rowAction.icon as IconProp} /> : undefined,
                  key: rowAction.actionId,
                  label: rowAction.label,
                })),
                onClick: ({ domEvent, key }) => {
                  // Don't let the menu click bubble to the row's navigate onClick.
                  domEvent.stopPropagation()
                  void fireRowAction(key, item)
                },
              }}
              trigger={['click']}
            >
              <Button
                aria-label='Row actions'
                icon={<FontAwesomeIcon icon={'fa-ellipsis-vertical' as IconProp} />}
                onClick={(event) => { event.stopPropagation() }}
                size='small'
                type='text'
              />
            </Dropdown>
          )
          : null

        return (
          <AntdList.Item
            actions={kebab ? [kebab] : undefined}
            className={row.navigateTo ? styles.clickable : undefined}
            extra={
              (row.secondaryText || row.subSecondaryText)
                ? (
                  <div className={styles.extra}>
                    {row.subSecondaryText && <Typography.Text type='secondary'>{row.subSecondaryText}</Typography.Text>}
                    {row.secondaryText && (
                      itemTemplate.secondaryTextAsTag
                        ? <Tag className={styles.tag} style={{ backgroundColor: soft, color: colorCode }}>{row.secondaryText}</Tag>
                        : <Typography.Text>{row.secondaryText}</Typography.Text>
                    )}
                  </div>
                )
                : undefined
            }
            key={`${rowKey}-${index}`}
            onClick={row.navigateTo ? () => { void navigate(row.navigateTo) } : undefined}
          >
            <AntdList.Item.Meta
              avatar={avatar}
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
