import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button as AntdButton } from 'antd'
import useApp from 'antd/es/app/useApp'

import { useHandleAction } from '../../hooks/useHandleActions'
import type { WidgetProps } from '../../types/Widget'

import type { Button as WidgetType } from './Button.type'

export type ButtonWidgetData = WidgetType['spec']['widgetData']

const Button = ({ resourcesRefs, uid, widget, widgetData }: WidgetProps<ButtonWidgetData>) => {
  const { actions, backgroundColor, block, clickActionId, color, danger, disabled, ghost, icon, label, shape, size, type, variant } = widgetData

  const { notification } = useApp()
  const { handleAction, isActionLoading } = useHandleAction()

  const action = Object.values(actions)
    .flat()
    .find(({ id }) => id === clickActionId)

  const onClick = async () => {
    if (!action) {
      notification.error({
        description: `The widget definition does not include an action (ID: ${clickActionId})`,
        message: 'Error while executing the action',
        placement: 'bottomLeft',
      })

      return
    }

    await handleAction(action, resourcesRefs, undefined, widget)
  }

  const handleClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    event.stopPropagation()

    onClick().catch((error) => {
      console.error('Error in button click handler:', error)
    })
  }

  return (
    <div>
      <AntdButton
        block={block}
        color={color}
        danger={danger}
        disabled={disabled}
        ghost={ghost}
        icon={icon ? <FontAwesomeIcon icon={icon as IconProp} /> : undefined}
        key={uid}
        loading={isActionLoading}
        onClick={(event) => handleClick(event)}
        shape={shape || 'default'}
        size={size || 'middle'}
        style={{ backgroundColor: backgroundColor || undefined }}
        type={type || 'primary'}
        variant={variant}
      >
        {label}
      </AntdButton>
    </div>
  )
}

export default Button
