import { Form, Input as AntdInput } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Input as WidgetType } from './Input.type'

export type InputWidgetData = WidgetType['spec']['widgetData']

/**
 * Faithful wrapper of antd `Input` as a form control. It renders a `Form.Item`
 * bound by `name`, so a parent `Form` widget collects its value on submit
 * (antd Form context). The control is meant to be a child of a `Form` widget.
 */
const Input = ({ uid, widgetData }: WidgetProps<InputWidgetData>) => {
  const { allowClear, defaultValue, disabled, label, maxLength, name, placeholder, required, size, type } = widgetData

  return (
    <Form.Item
      initialValue={defaultValue}
      key={uid}
      label={label}
      name={name}
      rules={required ? [{ message: `${label ?? name} is required`, required: true }] : undefined}
    >
      <AntdInput
        allowClear={allowClear}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        size={size}
        type={type}
      />
    </Form.Item>
  )
}

export default Input
