export interface Slider {
  version: string
  /**
   * Slider is a form-control widget wrapping Ant Design Slider. It renders inside a Form widget's context and binds its value by `name`. (min/max/step are integers — controller-gen rejects floats.)
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * form field key — antd Form.Item `name`
       */
      name: string
      /**
       * antd Form.Item `label`
       */
      label?: string
      /**
       * antd Form.Item `initialValue`
       */
      defaultValue?: number
      /**
       * antd Slider `min`
       */
      min?: number
      /**
       * antd Slider `max`
       */
      max?: number
      /**
       * antd Slider `step`
       */
      step?: number
      /**
       * antd Slider `disabled`
       */
      disabled?: boolean
    }
    apiRef?: {
      name: string
      namespace: string
    }
    widgetDataTemplate?: {
      forPath?: string
      expression?: string
    }[]
  }
}
