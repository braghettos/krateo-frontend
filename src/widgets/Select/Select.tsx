import { Form, Select as AntdSelect } from 'antd'
import { useSearchParams } from 'react-router'

import type { WidgetProps } from '../../types/Widget'

import type { Select as WidgetType } from './Select.type'

export type SelectWidgetData = WidgetType['spec']['widgetData']

/**
 * Faithful wrapper of antd `Select`. Two modes:
 *  • default — a `Form.Item` control bound by `name`, for use inside a `Form`.
 *  • `queryParam` set — a STANDALONE, URL-query-bound filter Select (no Form
 *    context), reading/writing `?<queryParam>=` in the URL — the same URL→extras
 *    channel RangePicker and the range chips use, so a data source can scope
 *    server-side (e.g. compositions-list reads `.project`). Value reflects deep
 *    links + back/forward; same-path navigation merges the param.
 */
const Select = ({ uid, widgetData }: WidgetProps<SelectWidgetData>) => {
  const { allowClear, defaultValue, disabled, label, mode, name, options, placeholder, queryParam, required, size } = widgetData
  const [searchParams, setSearchParams] = useSearchParams()

  if (queryParam) {
    const value = searchParams.get(queryParam) ?? undefined
    const onChange = (next?: string) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        if (next) {
          params.set(queryParam, next)
        } else {
          params.delete(queryParam)
        }
        return params
      }, { replace: false })
    }

    return (
      <AntdSelect
        allowClear={allowClear}
        disabled={disabled}
        key={uid}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        size={size}
        value={value}
      />
    )
  }

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
