export interface Checkbox {
  version: string
  /**
   * Checkbox is a form-control widget wrapping Ant Design Checkbox.Group (multi-select). It renders inside a Form widget's context and binds its value (array) by `name`.
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
       * initially-checked values — antd Form.Item `initialValue`
       */
      defaultValue?: string[]
      /**
       * antd Checkbox.Group `options`
       */
      options: {
        /**
         * option label (defaults to value)
         */
        label?: string
        /**
         * option value
         */
        value: string
        /**
         * antd option `disabled`
         */
        disabled?: boolean
      }[]
      /**
       * antd Checkbox.Group `disabled`
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
