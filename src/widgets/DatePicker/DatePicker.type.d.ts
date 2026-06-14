export interface DatePicker {
  version: string
  /**
   * DatePicker is a form-control widget wrapping Ant Design DatePicker. It renders inside a Form widget's context and binds its value by `name`. Values are ISO date strings (converted to/from Day.js).
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
       * initial date as an ISO string (parsed via Day.js into Form.Item `initialValue`)
       */
      defaultValue?: string
      /**
       * antd DatePicker `placeholder`
       */
      placeholder?: string
      /**
       * antd DatePicker `picker`
       */
      picker?: 'date' | 'week' | 'month' | 'quarter' | 'year'
      /**
       * antd DatePicker `format` (display format)
       */
      format?: string
      /**
       * antd DatePicker `size`
       */
      size?: 'small' | 'middle' | 'large'
      /**
       * antd DatePicker `disabled`
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
