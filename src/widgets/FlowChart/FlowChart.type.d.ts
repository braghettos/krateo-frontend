export interface FlowChart {
  version: string
  /**
   * FlowChart represents a Kubernetes composition as a directed graph. Each node represents a resource, and edges indicate parent-child relationships
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * list of kubernetes resources and their relationships to render as nodes in the flow chart
       */
      data: {
        /**
         * optional date value to be shown in the node, formatted as ISO 8601 string
         */
        date: string
        /**
         * custom icon displayed for the resource node
         */
        icon?: {
          /**
           * FontAwesome icon class name (e.g. 'fa-check')
           */
          name?: string
          /**
           * CSS color value for the icon background
           */
          color?: 'blue' | 'darkBlue' | 'orange' | 'gray' | 'red' | 'green' | 'violet'
          /**
           * optional tooltip message displayed on hover
           */
          message?: string
        }
        /**
         * custom status icon displayed alongside resource info
         */
        statusIcon?: {
          /**
           * FontAwesome icon class name representing status
           */
          name?: string
          /**
           * CSS color value for the status icon background
           */
          color?: 'blue' | 'darkBlue' | 'orange' | 'gray' | 'red' | 'green' | 'violet'
          /**
           * optional tooltip message describing the status
           */
          message?: string
        }
        /**
         * kubernetes resource type (e.g. Deployment, Service)
         */
        kind: string
        /**
         * name of the resource
         */
        name: string
        /**
         * namespace in which the resource is defined
         */
        namespace: string
        /**
         * list of parent resources used to define graph relationships
         */
        parentRefs?: {
          /**
           * optional date value to be shown in the node, formatted as ISO 8601 string
           */
          date?: string
          /**
           * custom icon for the parent resource
           */
          icon?: {
            /**
             * FontAwesome icon class name
             */
            name?: string
            /**
             * CSS color value for the icon background
             */
            color?: 'blue' | 'darkBlue' | 'orange' | 'gray' | 'red' | 'green' | 'violet'
            /**
             * optional tooltip message
             */
            message?: string
          }
          /**
           * custom status icon for the parent resource
           */
          statusIcon?: {
            /**
             * FontAwesome icon class name
             */
            name?: string
            /**
             * CSS color value for the status icon background
             */
            color?: 'blue' | 'darkBlue' | 'orange' | 'gray' | 'red' | 'green' | 'violet'
            /**
             * optional tooltip message
             */
            message?: string
          }
          /**
           * resource type of the parent
           */
          kind?: string
          /**
           * name of the parent resource
           */
          name?: string
          /**
           * namespace of the parent resource
           */
          namespace?: string
          /**
           * nested parent references for recursive relationships
           */
          parentRefs?: {
            [k: string]: unknown
          }[]
          /**
           * internal version string of the parent resource
           */
          resourceVersion?: string
          /**
           * unique identifier of the parent resource
           */
          uid?: string
          /**
           * api version of the parent resource
           */
          version?: string
          [k: string]: unknown
        }[]
        /**
         * internal version string of the resource
         */
        resourceVersion: string
        /**
         * unique identifier of the resource
         */
        uid: string
        /**
         * api version of the resource
         */
        version: string
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
  }
}
