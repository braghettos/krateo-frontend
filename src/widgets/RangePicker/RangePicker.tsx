import { DatePicker } from 'antd'
import dayjs from 'dayjs'
import { useSearchParams } from 'react-router'

import type { WidgetProps } from '../../types/Widget'

import type { RangePicker as WidgetType } from './RangePicker.type'

const { RangePicker: AntdRangePicker } = DatePicker

export type RangePickerWidgetData = WidgetType['spec']['widgetData']

/**
 * antd `DatePicker.RangePicker` bound to URL state (NOT a Form control). The selected
 * window lives in the `?from=&to=` query params as epoch seconds — the same URL→extras
 * channel the preset range chips use — so a data source (e.g. compositions-list) can
 * time-window server-side. Picking a custom range also stamps `range=custom` so the
 * preset chips de-select and their preset window yields to from/to; clearing removes all
 * three. The value is read back from the URL, so the control reflects deep links and
 * browser back/forward. Param names are fixed (`from`/`to`/`range`) to match the
 * server-side jq contract — they are behaviour, not configurable antd props.
 */
const RangePicker = ({ uid, widgetData }: WidgetProps<RangePickerWidgetData>) => {
  const { allowClear, disabled, format, placeholder, size } = widgetData
  const [searchParams, setSearchParams] = useSearchParams()

  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const value: [dayjs.Dayjs, dayjs.Dayjs] | null =
    from && to ? [dayjs.unix(Number(from)), dayjs.unix(Number(to))] : null

  const onChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (dates?.[0] && dates[1]) {
          next.set('range', 'custom')
          next.set('from', String(dates[0].startOf('day').unix()))
          next.set('to', String(dates[1].endOf('day').unix()))
        } else {
          next.delete('range')
          next.delete('from')
          next.delete('to')
        }

        return next
      },
      { replace: false }
    )
  }

  return (
    <AntdRangePicker
      allowClear={allowClear}
      disabled={disabled}
      format={format}
      key={uid}
      onChange={onChange}
      placeholder={placeholder as [string, string] | undefined}
      size={size}
      value={value}
    />
  )
}

export default RangePicker
