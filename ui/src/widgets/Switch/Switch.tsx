import { Form, Switch as AntdSwitch } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Switch as WidgetType } from './Switch.type'

export type SwitchWidgetData = WidgetType['spec']['widgetData']

/**
 * Faithful wrapper of antd `Switch` as a form control. Boolean fields bind via
 * `valuePropName="checked"`; meant to live inside a `Form` widget's context.
 */
const Switch = ({ uid, widgetData }: WidgetProps<SwitchWidgetData>) => {
  const { checkedChildren, defaultChecked, disabled, label, name, size, unCheckedChildren } = widgetData

  return (
    <Form.Item
      initialValue={defaultChecked}
      key={uid}
      label={label}
      name={name}
      valuePropName='checked'
    >
      <AntdSwitch
        checkedChildren={checkedChildren}
        disabled={disabled}
        size={size}
        unCheckedChildren={unCheckedChildren}
      />
    </Form.Item>
  )
}

export default Switch
