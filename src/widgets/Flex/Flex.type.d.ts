export interface Flex {
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
        | 'cards'
        | 'cols'
        | 'eventlists'
        | 'filters'
        | 'flexes'
        | 'flowcharts'
        | 'forms'
        | 'linecharts'
        | 'lists'
        | 'markdowns'
        | 'paragraphs'
        | 'piecharts'
        | 'rows'
        | 'statistics'
        | 'steps'
        | 'tables'
        | 'tabs'
        | 'tags'
        | 'yamlviewers'
      )[]
      /**
       * antd Flex vertical (column direction)
       */
      vertical?: boolean
      /**
       * antd Flex justify (CSS justify-content)
       */
      justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
      /**
       * antd Flex align (CSS align-items)
       */
      align?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
      /**
       * antd Flex gap (SizeType)
       */
      gap?: 'small' | 'middle' | 'large'
      /**
       * antd Flex wrap
       */
      wrap?: boolean
      /**
       * the child widgets rendered inside the Flex
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
