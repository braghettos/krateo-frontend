import { Form, Select as AntdSelect } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Select as WidgetType } from './Select.type'

export type SelectWidgetData = WidgetType['spec']['widgetData']

/**
 * Faithful wrapper of antd `Select` as a form control: a `Form.Item` bound by
 * `name` around an antd Select, meant to live inside a `Form` widget's context.
 */
const Select = ({ uid, widgetData }: WidgetProps<SelectWidgetData>) => {
  const { allowClear, defaultValue, disabled, label, mode, name, options, placeholder, required, size } = widgetData

  return (
    <Form.Item
      initialValue={defaultValue}
      key={uid}
      label={label}
      name={name}
      rules={required ? [{ message: `${label ?? name} is required`, required: true }] : undefined}
    >
      <AntdSelect
        allowClear={allowClear}
        disabled={disabled}
        mode={mode}
        options={options}
        placeholder={placeholder}
        size={size}
      />
    </Form.Item>
  )
}

export default Select
