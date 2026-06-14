import { Checkbox as AntdCheckbox, Form } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Checkbox as WidgetType } from './Checkbox.type'

export type CheckboxWidgetData = WidgetType['spec']['widgetData']

/** Faithful wrapper of antd `Checkbox.Group` as a multi-select form control (Form.Item name binding). */
const Checkbox = ({ uid, widgetData }: WidgetProps<CheckboxWidgetData>) => {
  const { defaultValue, disabled, label, name, options, required } = widgetData

  return (
    <Form.Item
      initialValue={defaultValue}
      key={uid}
      label={label}
      name={name}
      rules={required ? [{ message: `${label ?? name} is required`, required: true }] : undefined}
    >
      <AntdCheckbox.Group
        disabled={disabled}
        options={options.map((opt) => ({ disabled: opt.disabled, label: opt.label ?? opt.value, value: opt.value }))}
      />
    </Form.Item>
  )
}

export default Checkbox
