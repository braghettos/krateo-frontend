import { Form, Slider as AntdSlider } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Slider as WidgetType } from './Slider.type'

export type SliderWidgetData = WidgetType['spec']['widgetData']

/** Faithful wrapper of antd `Slider` as a form control (Form.Item name binding). */
const Slider = ({ uid, widgetData }: WidgetProps<SliderWidgetData>) => {
  const { defaultValue, disabled, label, max, min, name, step } = widgetData

  return (
    <Form.Item initialValue={defaultValue} key={uid} label={label} name={name}>
      <AntdSlider disabled={disabled} max={max} min={min} step={step} />
    </Form.Item>
  )
}

export default Slider
