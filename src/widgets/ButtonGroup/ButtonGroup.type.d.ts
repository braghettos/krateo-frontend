export interface ButtonGroup {
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
       * the alignment of the element inside the ButtonGroup. Default is 'left'
       */
      alignment?: 'center' | 'left' | 'right'
      /**
       * the list of resources that are allowed to be children of this widget or referenced by it
       */
      allowedResources: (
        | 'barcharts'
        | 'buttons'
        | 'eventlists'
        | 'filters'
        | 'flowcharts'
        | 'forms'
        | 'linecharts'
        | 'markdowns'
        | 'panels'
        | 'paragraphs'
        | 'piecharts'
        | 'tables'
        | 'tablists'
        | 'yamlviewers'
      )[]
      /**
       * antd Space size — spacing between items (legacy `gap` still accepted)
       */
      size?: 'small' | 'middle' | 'large'
      /**
       * antd Space direction
       */
      direction?: 'horizontal' | 'vertical'
      /**
       * antd Space wrap
       */
      wrap?: boolean
      /**
       * the items of the ButtonGroup
       */
      items: {
        resourceRefId: string
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
