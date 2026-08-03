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
      /**
       * when set, the Input is a STANDALONE URL-query-bound SEARCH box (antd Input.Search), NOT a Form control: submitting (Enter / search button) writes ?<queryParam>= into the URL → extras, so a data source can filter server-side in its RESTAction jq (e.g. `.q`). Clearing removes the param.
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
