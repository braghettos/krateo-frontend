export interface Descriptions {
  version: string
  /**
   * Descriptions displays multiple read-only label/value pairs in a definition list (antd Descriptions)
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * the title displayed above the description list
       */
      title?: string
      /**
       * the number of label/value pairs per row (antd Descriptions `column`)
       */
      column?: number
      /**
       * whether to render cell borders (antd Descriptions `bordered`)
       */
      bordered?: boolean
      /**
       * the size of the description list
       */
      size?: 'default' | 'middle' | 'small'
      /**
       * the label/value pairs to display
       */
      items: {
        /**
         * the label of the item
         */
        label: string
        /**
         * the value of the item (rendered as the antd Descriptions item children)
         */
        value: string
        /**
         * how many columns this item spans (antd Descriptions item `span`)
         */
        span?: number
      }[]
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
        allowed: boolean
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
