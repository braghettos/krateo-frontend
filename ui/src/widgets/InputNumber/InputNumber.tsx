import { Form, InputNumber as AntdInputNumber } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { InputNumber as WidgetType } from './InputNumber.type'

export type InputNumberWidgetData = WidgetType['spec']['widgetData']

/** Faithful wrapper of antd `InputNumber` as a form control (Form.Item name binding). */
const InputNumber = ({ uid, widgetData }: WidgetProps<InputNumberWidgetData>) => {
  const { defaultValue, disabled, label, max, min, name, placeholder, required, size, step } = widgetData

  return (
    <Form.Item
      initialValue={defaultValue}
      key={uid}
      label={label}
      name={name}
      rules={required ? [{ message: `${label ?? name} is required`, required: true }] : undefined}
    >
      <AntdInputNumber
        disabled={disabled}
        max={max}
        min={min}
        placeholder={placeholder}
        size={size}
        step={step}
        style={{ width: '100%' }}
      />
    </Form.Item>
  )
}

export default InputNumber
