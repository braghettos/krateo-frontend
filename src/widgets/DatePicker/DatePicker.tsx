import { DatePicker as AntdDatePicker, Form } from 'antd'
import dayjs from 'dayjs'

import type { WidgetProps } from '../../types/Widget'

import type { DatePicker as WidgetType } from './DatePicker.type'

export type DatePickerWidgetData = WidgetType['spec']['widgetData']

/**
 * Faithful wrapper of antd `DatePicker` as a form control. antd's value is a
 * Day.js object (not serializable), so `defaultValue` is an ISO string parsed
 * via dayjs into `Form.Item.initialValue`; the parent Form serializes on submit.
 */
const DatePicker = ({ uid, widgetData }: WidgetProps<DatePickerWidgetData>) => {
  const { defaultValue, disabled, format, label, name, picker, placeholder, required, size } = widgetData

  return (
    <Form.Item
      initialValue={defaultValue ? dayjs(defaultValue) : undefined}
      key={uid}
      label={label}
      name={name}
      rules={required ? [{ message: `${label ?? name} is required`, required: true }] : undefined}
    >
      <AntdDatePicker
        disabled={disabled}
        format={format}
        picker={picker}
        placeholder={placeholder}
        size={size}
        style={{ width: '100%' }}
      />
    </Form.Item>
  )
}

export default DatePicker
