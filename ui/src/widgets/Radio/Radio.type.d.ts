export interface Radio {
  version: string
  /**
   * Radio is a form-control widget wrapping Ant Design Radio.Group. It renders inside a Form widget's context and binds its value by `name`.
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
      defaultValue?: string
      /**
       * antd Radio.Group `options`
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
       * antd Radio.Group `optionType`
       */
      optionType?: 'default' | 'button'
      /**
       * antd Radio.Group `buttonStyle`
       */
      buttonStyle?: 'outline' | 'solid'
      /**
       * antd Radio.Group `size`
       */
      size?: 'small' | 'middle' | 'large'
      /**
       * antd Radio.Group `disabled`
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
    resourcesRefs?: {
      items: {
        allowed?: boolean
        apiVersion?: string
        id: string
        name?: string
        namespace?: string
        payload?: {
          [k: string]: unknown
        }
        resource?: string
        verb?: 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GET'
        slice?: {
          offset?: number
          page: number
          perPage: number
          continue?: boolean
          [k: string]: unknown
        }
        [k: string]: unknown
      }[]
      [k: string]: unknown
    }
    resourcesRefsTemplate?: {
      iterator?: string
      template?: {
        apiVersion?: string
        id?: string
        name?: string
        namespace?: string
        payload?: {
          [k: string]: unknown
        }
        resource?: string
        verb?: 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GET'
      }
    }[]
  }
}
