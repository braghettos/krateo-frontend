export interface Col {
  /**
   * widget version
   */
  version: string
  /**
   * Col is a layout component that arranges its children in a vertical stack, aligning them one above the other with spacing between them
   */
  kind: string
  spec: {
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
       * the items of the column
       */
      items: {
        /**
         * the identifier of the k8s Custom Resource that should be represented, usually a widget
         */
        resourceRefId: string
      }[]
      /**
       * antd Col span — cells occupied, 0 (hidden) to 24 (full width). Renamed from `size`, which is still accepted.
       */
      span?: number
      /**
       * antd Col offset
       */
      offset?: number
      /**
       * antd Col order
       */
      order?: number
      /**
       * antd Col flex
       */
      flex?: string
      /**
       * antd Col xs span
       */
      xs?: number
      /**
       * antd Col sm span
       */
      sm?: number
      /**
       * antd Col md span
       */
      md?: number
      /**
       * antd Col lg span
       */
      lg?: number
      /**
       * antd Col xl span
       */
      xl?: number
      /**
       * antd Col xxl span
       */
      xxl?: number
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
