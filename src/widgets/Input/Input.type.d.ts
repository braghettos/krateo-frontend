export interface Input {
  version: string
  /**
   * Input is a form-control widget wrapping Ant Design Input. It renders inside a Form widget's context and binds its value by `name`.
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * form field key — antd Form.Item `name` (collected on submit)
       */
      name: string
      /**
       * antd Form.Item `label`
       */
      label?: string
      /**
       * add a required validation rule to the field
       */
      required?: boolean
      /**
       * antd Form.Item `initialValue`
       */
      defaultValue?: string
      /**
       * antd Input `placeholder`
       */
      placeholder?: string
      /**
       * antd Input `type`
       */
      type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url'
      /**
       * antd Input `size`
       */
      size?: 'small' | 'middle' | 'large'
      /**
       * antd Input `disabled`
       */
      disabled?: boolean
      /**
       * antd Input `allowClear`
       */
      allowClear?: boolean
      /**
       * antd Input `maxLength`
       */
      maxLength?: number
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
