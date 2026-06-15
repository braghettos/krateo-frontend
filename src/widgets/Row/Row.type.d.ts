export interface Row {
  /**
   * widget version
   */
  version: string
  /**
   * name of the k8s Custom Resource
   */
  kind: string
  spec: {
    /**
     * the data that will be passed to the widget on the frontend
     */
    widgetData: {
      /**
       * the list of resources that are allowed to be children of this widget or referenced by it
       */
      allowedResources: (
        | 'barcharts'
        | 'buttons'
        | 'buttongroups'
        | 'cols'
        | 'lists'
        | 'eventlists'
        | 'filters'
        | 'flowcharts'
        | 'forms'
        | 'linecharts'
        | 'markdowns'
        | 'cards'
        | 'paragraphs'
        | 'piecharts'
        | 'rows'
        | 'tables'
        | 'tabs'
        | 'yamlviewers'
      )[]
      /**
       * the alignment of the element inside the row. Default is 'center'
       */
      alignment?: 'bottom' | 'center' | 'top'
      /**
       * the items of the row
       */
      items: {
        resourceRefId: string
        /**
         * the number of cells that the item will occupy, from 0 (not displayed) to 24 (occupies all space)
         */
        size?: number
        /**
         * the alignment of the element inside the cell. Default is 'left'
         */
        alignment?: 'center' | 'left' | 'right'
      }[]
    }
    resourcesRefs: {
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
