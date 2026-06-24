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
    // `mode: multiple` (or `tags`) makes the URL-bound Select a MULTI-select: the value is a
    // comma-joined list in `?<queryParam>=` (e.g. the project/namespace multi-scope → a data
    // source reads it as an array). Single mode keeps the scalar param.
    const isMulti = mode === 'multiple' || mode === 'tags'
    const raw = searchParams.get(queryParam) ?? ''
    const multiSelected = raw ? raw.split(',') : []
    const value = isMulti ? multiSelected : (raw || undefined)
    const onChange = (next?: string | string[]) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev)
        const joined = Array.isArray(next) ? next.join(',') : (next ?? '')
        if (joined) {
          params.set(queryParam, joined)
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
        mode={isMulti ? mode : undefined}
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
