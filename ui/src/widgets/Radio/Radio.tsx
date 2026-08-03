import { Form, Radio as AntdRadio } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Radio as WidgetType } from './Radio.type'

export type RadioWidgetData = WidgetType['spec']['widgetData']

/**
 * Faithful wrapper of antd `Radio.Group` as a form control: a `Form.Item` bound
 * by `name` around the radio group, meant to live inside a `Form` widget context.
 */
const Radio = ({ uid, widgetData }: WidgetProps<RadioWidgetData>) => {
  const { buttonStyle, defaultValue, disabled, label, name, optionType, options, required, size } = widgetData

  return (
    <Form.Item
      initialValue={defaultValue}
      key={uid}
      label={label}
      name={name}
      rules={required ? [{ message: `${label ?? name} is required`, required: true }] : undefined}
    >
      <AntdRadio.Group
        buttonStyle={buttonStyle}
        disabled={disabled}
        optionType={optionType}
        options={options.map((opt) => ({ disabled: opt.disabled, label: opt.label ?? opt.value, value: opt.value }))}
        size={size}
      />
    </Form.Item>
  )
}

export default Radio
