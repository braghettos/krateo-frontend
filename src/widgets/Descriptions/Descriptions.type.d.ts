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
       * rendering style. 'default' = antd Descriptions definition list; 'form' = read-only mirror of the create Form's property layout — each item a connector-rail field (bold label above a mono value), grouped into sections by the item's `section` (nested objects each become a labelled section)
       */
      variant?: 'default' | 'form'
      /**
       * the label/value pairs to display
       */
      items: {
        /**
         * the label of the item
         */
        label: string
        /**
         * (variant:form only) the section this property is grouped under — e.g. a nested object's top-level key; empty/absent = the ungrouped top section
         */
        section?: string
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
