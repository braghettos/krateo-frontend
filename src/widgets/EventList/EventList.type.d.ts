export interface EventList {
  /**
   * widget version
   */
  version: string
  /**
   * EventList renders data coming from a Kubernetes cluster or Server Sent Events associated to a specific endpoint and topic
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * list of events received from a k8s cluster or server sent event
       */
      events: SSEK8sEvent[]
      /**
       * filter prefix used to filter data
       */
      prefix?: string
      /**
       * endpoint url for server sent events connection
       */
      sseEndpoint?: string
      /**
       * subscription topic for server sent events
       */
      sseTopic?: string
    }
    resourcesRefs?: {
      items?: {
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
