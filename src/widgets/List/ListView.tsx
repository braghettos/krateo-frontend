import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Avatar, Card, List as AntdList, Button, Dropdown, Progress, Tag, Typography } from 'antd'
import useApp from 'antd/es/app/useApp'
import type { ListGridType } from 'antd/es/list'
import type { CSSProperties, ReactNode } from 'react'
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

        // Tree row (detail Relations): a tight single-line mono row — `└─` connector
        // + status dot + Kind + muted inline name + right-aligned colored state.
        if (itemTemplate.rowVariant === 'tree') {
          return (
            <AntdList.Item
              className={`${styles.treeRow} ${row.navigateTo ? styles.clickable : ''}`}
              key={`${rowKey}-${index}`}
              onClick={row.navigateTo ? () => { void navigate(row.navigateTo) } : undefined}
            >
              <span className={styles.treeConnector}>└─</span>
              <span className={styles.treeDot} style={{ backgroundColor: colorCode, boxShadow: `0 0 5px 1px ${colorCode}` }} />
              <span className={styles.treeKind}>{row.primaryText}</span>
              {row.subPrimaryText && <span className={styles.treeName}>{row.subPrimaryText}</span>}
              {row.secondaryText && <span className={styles.treeState} style={{ color: colorCode }}>{row.secondaryText}</span>}
            </AntdList.Item>
          )
        }

        // Card tile (Marketplace catalog grid): render the row as a full antd Card —
        // icon-tile + name + version badge + category tag + 2-line description + a footer
        // of `rowActions` as VISIBLE buttons (first = primary), instead of a List.Item row
        // with a kebab. Whole-card click still navigates when the row carries `navigateTo`.
        if (itemTemplate.rowVariant === 'card') {
          const cardActions = (itemTemplate.rowActions ?? []).map((rowAction, actionIndex) => (
            <Button
              danger={rowAction.danger}
              icon={rowAction.icon ? <FontAwesomeIcon icon={rowAction.icon as IconProp} /> : undefined}
              key={rowAction.actionId}
              onClick={(event) => { event.stopPropagation(); void fireRowAction(rowAction.actionId, item) }}
              size='small'
              type={actionIndex === 0 ? 'primary' : 'default'}
            >
              {rowAction.label}
            </Button>
          ))
          // Footer-left "Configure →" cue for clickable cards (mockup `.configure`); provider/ns moves right.
          const ctaCue = row.cardCta && row.navigateTo
            ? <span className={styles.cardCta}>{row.cardCta}<span className={styles.cardCtaArrow}>→</span></span>
            : null
          const provider = row.subSecondaryText ? <span className={styles.cardProvider}>{row.subSecondaryText}</span> : null
          return (
            <AntdList.Item key={`${rowKey}-${index}`}>
              <Card
                className={`${styles.tileCard} ${row.navigateTo ? styles.clickable : ''}`}
                hoverable={Boolean(row.navigateTo)}
                onClick={row.navigateTo ? () => { void navigate(row.navigateTo) } : undefined}
                size='small'
              >
                <div className={styles.cardTop}>
                  {avatar}
                  <div className={styles.cardTitles}>
                    {/* Name alone on the first line; version badge + category tag share the meta line below it. */}
                    <span className={styles.cardName}>{row.primaryText}</span>
                    {(row.secondaryText || row.subPrimaryText) && (
                      <div className={styles.cardMeta}>
                        {row.secondaryText && (
                          <Tag className={`${styles.tag} ${styles.cardCatTag}`} style={{ backgroundColor: soft, color: colorCode }}>{row.secondaryText}</Tag>
                        )}
                        {row.subPrimaryText && <span className={styles.verBadge}>{row.subPrimaryText}</span>}
                      </div>
                    )}
                  </div>
                </div>
                {/* Always render (even when empty) so the 2-line min-height reserves space → equal-height tiles. */}
                <div className={styles.cardDesc}>{row.description}</div>
                {(cardActions.length > 0 || provider || ctaCue) && (
                  <div className={styles.cardFoot}>
                    {/* Footer-left: provider/ns. Right group: the "Configure →" cue + any action buttons
                        (arrow points toward the right edge). */}
                    {provider}
                    <div className={styles.cardFootActions}>
                      {ctaCue}
                      {cardActions}
                    </div>
                  </div>
                )}
              </Card>
            </AntdList.Item>
          )
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

        // Reconciliation-rail row: the mockup's desired-vs-actual gauge. The FILL is cyan
        // (the CONVERGED %), and the un-filled remainder carries a state-coloured diagonal
        // HATCH (drift magenta / pending amber / fail crimson) via the --rail-rem CSS var —
        // honest now that healthPercent counts BOTH Ready+Synced (drift = 50%, so the gap is
        // real). The `line` variant keeps the plain state-coloured fill; the % label stays
        // state-coloured on both.
        const isRail = row.bar?.variant === 'rail'
        const barStateColor = getColorCode(row.bar?.color)
        const barEl = row.bar
          ? (
            <div
              className={`${styles.bar} ${isRail ? styles.railBar : ''}`}
              style={isRail ? ({ '--rail-rem': barStateColor } as CSSProperties) : undefined}
            >
              <Progress
                percent={row.bar.percent}
                showInfo={false}
                size='small'
                strokeColor={isRail ? getColorCode('cyan') : barStateColor}
              />
              {row.bar.label && <span className={styles.barLabel} style={{ color: barStateColor }}>{row.bar.label}</span>}
            </div>
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
                        : <span className={styles.stateText} style={{ color: colorCode }}>{row.secondaryText}</span>
                    )}
                  </div>
                )
                : undefined
            }
            key={`${rowKey}-${index}`}
            onClick={row.navigateTo ? () => { void navigate(row.navigateTo) } : undefined}
          >
            {/* Reconciliation-rail aggregate band: no avatar/label → let the bar span full width
                (a List.Item.Meta with empty title still claims ~half the row otherwise). */}
            {(avatar || row.primaryText || row.subPrimaryText) && (
              <AntdList.Item.Meta
                avatar={avatar}
                description={row.subPrimaryText && itemTemplate.subPrimaryTextMono
                  ? <span className={styles.refPill}>{row.subPrimaryText}</span>
                  : (row.subPrimaryText || undefined)}
                title={row.primaryText}
              />
            )}
            {barEl}
          </AntdList.Item>
        )
      }}
      size={size}
      split={split}
    />
  )
}
