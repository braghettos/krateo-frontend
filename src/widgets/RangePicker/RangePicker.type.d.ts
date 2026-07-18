export interface RangePicker {
  version: string
  /**
   * RangePicker wraps Ant Design DatePicker.RangePicker as a standalone URL-bound filter (NOT a Form control). The selected [start, end] window is written to the `from`/`to` query params (epoch seconds) plus `range=custom`, so a data source can time-window server-side via request extras. Clearing removes those params.
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * antd RangePicker `placeholder` ([start, end])
       */
      placeholder?: string[]
      /**
       * antd RangePicker `format` (display format)
       */
      format?: string
      /**
       * antd RangePicker `size`
       */
      size?: 'small' | 'middle' | 'large'
      /**
       * antd RangePicker `allowClear`
       */
      allowClear?: boolean
      /**
       * antd RangePicker `disabled`
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
