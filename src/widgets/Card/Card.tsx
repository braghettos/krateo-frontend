import { QuestionCircleOutlined } from '@ant-design/icons'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Card as AntdCard, Avatar, Button, Tag, Tooltip } from 'antd'
import useApp from 'antd/es/app/useApp'
import { useState } from 'react'

import WidgetRenderer from '../../components/WidgetRenderer'
import { useHandleAction } from '../../hooks/useHandleActions'
import { getColorCode } from '../../theme/palette'
import type { ResourcesRefs, WidgetAction, WidgetProps } from '../../types/Widget'
import { getEndpointUrl } from '../../utils/utils'

import styles from './Card.module.css'
import type { Card as WidgetType } from './Card.type'

export type CardWidgetData = WidgetType['spec']['widgetData']

const FooterItem = ({ resourceRefId, resourcesRefs }: { resourceRefId: string; resourcesRefs: ResourcesRefs }) => {
  const [isLoading, setIsLoading] = useState(true)

  const endpoint = getEndpointUrl(resourceRefId, resourcesRefs)
  if (!endpoint) { return null }

  return (
    <div className={`${styles.item} ${isLoading ? styles.itemLoading : ''}`}>
      <WidgetRenderer onLoadingChange={setIsLoading} widgetEndpoint={endpoint}/>
    </div>
  )
}

const Card = ({ resourcesRefs, uid, widget, widgetData }: WidgetProps<CardWidgetData>) => {
  const { notification } = useApp()
  const { handleAction, isActionLoading } = useHandleAction()

  // antd Card reserves `actions` for footer nodes, so the Krateo event map is `widgetActions`.
  const { clickActionId, cover, extra, footer, headerLeft, icon, items, size, tags, title, tooltip, variant, widgetActions } = widgetData
  const coverEndpoint = cover ? getEndpointUrl(cover, resourcesRefs) : undefined

  const action: WidgetAction | undefined = Object.values(widgetActions ?? {})
    .flat()
    .find(({ id }) => id === clickActionId)

  const onClick = async () => {
    if (!action) {
      if (clickActionId) {
        notification.error({
          description: `The widget definition does not include an action (ID: ${clickActionId})`,
          message: 'Error while executing the action',
          placement: 'bottomLeft',
        })
      }

      return
    }

    await handleAction(action, resourcesRefs, undefined, widget)
  }

  const handleClick = () => {
    onClick().catch((error) => {
      console.error('Error in panel click handler:', error)
    })
  }

  const panelHeader = (
    <div className={styles.bodyHeader}>
      <div>{headerLeft}</div>
    </div>
  )
  const panelFooter = (
    <div className={`${styles.footer} ${!tags && footer?.length === 1 ? styles.single : ''}`}>
      {tags && tags.length > 0 && (
        <div className={styles.tags}>
          {tags.map((tag, index) => (
            <Tag key={`tag-${index}`}>{tag}</Tag>
          ))}
        </div>
      )}

      {footer && footer.length > 0 && (
        <div className={styles.items}>
          {footer.map(({ resourceRefId }, index) => (
            <FooterItem
              key={`${uid}-footer-${index}`}
              resourceRefId={resourceRefId}
              resourcesRefs={resourcesRefs}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <AntdCard
      className={`${styles.panel} ${action ? styles.clickable : ''}`}
      classNames={{ body: styles.bodyWrapper, header: styles.header, title: styles.title }}
      cover={coverEndpoint ? <WidgetRenderer widgetEndpoint={coverEndpoint} /> : undefined}
      extra={
        (extra || tooltip)
          ? (
            <>
              {extra}
              {tooltip && (
                <Tooltip title={tooltip}>
                  <Button icon={<QuestionCircleOutlined />} type='text' />
                </Tooltip>
              )}
            </>
          )
          : undefined
      }
      key={uid}
      loading={isActionLoading}
      onClick={handleClick}
      size={size}
      title={
        (title || icon) && (
          <div className={styles.title}>
            {icon && (
              <Avatar
                icon={<FontAwesomeIcon icon={icon.name as IconProp} />}
                size={64}
                style={{ backgroundColor: getColorCode(icon.color) }}
              />
            )}
            <div className={styles.text}>
              <Tooltip title={title}>
                {title}
              </Tooltip>
            </div>
          </div>
        )
      }
      variant={variant}
    >
      <div className={styles.content}>
        {headerLeft && panelHeader}
        <div className={styles.body}>
          {items
            .map(({ resourceRefId }, index) => {
              const endpoint = getEndpointUrl(resourceRefId, resourcesRefs)
              if (!endpoint) {
                return null
              }

              return <WidgetRenderer key={`${uid}-${index}`} widgetEndpoint={endpoint} />
            })
            .filter(Boolean)}
        </div>
        {footer && panelFooter}
      </div>
    </AntdCard>
  )
}

export default Card
