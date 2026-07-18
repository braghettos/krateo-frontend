export interface Select {
  version: string
  /**
   * Select is a form-control widget wrapping Ant Design Select. It renders inside a Form widget's context and binds its value by `name`.
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
       * antd Select `options`
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
       * antd Select `mode`
       */
      mode?: 'multiple' | 'tags'
      /**
       * antd Select `placeholder`
       */
      placeholder?: string
      /**
       * antd Select `size`
       */
      size?: 'small' | 'middle' | 'large'
      /**
       * antd Select `disabled`
       */
      disabled?: boolean
      /**
       * antd Select `allowClear`
       */
      allowClear?: boolean
      /**
       * when set, the Select is STANDALONE and URL-query-bound (not a Form.Item control): its value reads from / writes to this URL search param (e.g. 'project'), flowing to server-side `extras` like RangePicker. Omit for the default Form control behavior.
       */
      queryParam?: string
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
