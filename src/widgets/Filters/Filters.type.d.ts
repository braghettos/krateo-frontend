export interface Filters {
  version: string
  kind: string
  spec: {
    widgetData: {
      /**
       * the prefix used to share filter values with the widgets being filtered
       */
      prefix: string
      /**
       * resourceRefIds of form-control widgets (Input/Select/Switch/DatePicker/…) composed as filter fields. Each control's `name` is the dotted data path it filters; the match strategy is inferred from the value type.
       */
      items: {
        /**
         * the identifier of the form-control widget to render as a filter field
         */
        resourceRefId: string
      }[]
    }
    resourcesRefs?: {
      items: {
        allowed?: boolean
        apiVersion?: string
        id: string
        name?: string
        namespace?: string
        resource?: string
        verb?: 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GET'
        [k: string]: unknown
      }[]
      [k: string]: unknown
    }
    apiRef?: {
      name: string
      namespace: string
    }
    widgetDataTemplate?: {
      forPath?: string
      expression?: string
    }[]
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
