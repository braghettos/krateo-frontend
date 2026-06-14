export interface InputNumber {
  version: string
  /**
   * InputNumber is a form-control widget wrapping Ant Design InputNumber. It renders inside a Form widget's context and binds its value by `name`. (min/max/step are integers — controller-gen rejects floats.)
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
       * add a required validation rule
       */
      required?: boolean
      /**
       * antd Form.Item `initialValue`
       */
      defaultValue?: number
      /**
       * antd InputNumber `placeholder`
       */
      placeholder?: string
      /**
       * antd InputNumber `min`
       */
      min?: number
      /**
       * antd InputNumber `max`
       */
      max?: number
      /**
       * antd InputNumber `step`
       */
      step?: number
      /**
       * antd InputNumber `size`
       */
      size?: 'small' | 'middle' | 'large'
      /**
       * antd InputNumber `disabled`
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
