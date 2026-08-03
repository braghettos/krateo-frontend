export interface Breadcrumb {
  version: string
  /**
   * Breadcrumb wraps the Ant Design Breadcrumb component: an ordered list of crumbs, each an optional link.
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * antd Breadcrumb `items`
       */
      items: {
        /**
         * crumb label (antd Breadcrumb ItemType.title)
         */
        title: string
        /**
         * optional link target (antd Breadcrumb ItemType.href)
         */
        href?: string
      }[]
      /**
       * antd Breadcrumb `separator` (default "/")
       */
      separator?: string
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
