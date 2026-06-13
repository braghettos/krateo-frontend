export interface Tabs {
  /**
   * widget version
   */
  version: string
  /**
   * Tabs display a set of tab items for navigation or content grouping
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
        | 'columns'
        | 'datagrids'
        | 'eventlists'
        | 'filters'
        | 'flowcharts'
        | 'forms'
        | 'linecharts'
        | 'markdowns'
        | 'panels'
        | 'paragraphs'
        | 'piecharts'
        | 'rows'
        | 'tables'
        | 'tablists'
        | 'yamlviewers'
      )[]
      /**
       * the items of the tab list
       */
      items: {
        /**
         * text displayed on the tab
         */
        label?: string
        /**
         * the identifier of the k8s custom resource represented by the tab content
         */
        resourceRefId: string
        /**
         * optional title to be displayed inside the tab
         */
        title?: string
      }[]
    }
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
