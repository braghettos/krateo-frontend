export interface Menu {
  version: string
  /**
   * antd Menu — navigation. `items` are inline nav entries: a `label`+`path` makes a visible sidebar entry and a route; a label-less item is a route-only (hidden) route. Content resolves by resourceRefId or the flexes/page-<slug> convention.
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * antd Menu mode (default inline)
       */
      mode?: 'vertical' | 'horizontal' | 'inline'
      /**
       * antd Menu theme
       */
      theme?: 'light' | 'dark'
      /**
       * the list of resources that are allowed to be children of this widget or referenced by it
       */
      allowedResources: ('navmenuitems' | 'pages')[]
      /**
       * navigation entries (inline nav data); each references its content widget by resourceRefId or resolves via the path → flexes/page-<slug> convention. A label-less item registers a route with no sidebar entry.
       */
      items: {
        /**
         * route path; '{param}' segments become :param and reach the content widget via ?extras. A label-less item registers a route with NO sidebar entry (hidden — e.g. detail/create/search).
         */
        path?: string
        /**
         * menu entry label; omit for a route-only (hidden) item
         */
        label?: string
        /**
         * FontAwesome icon name shown beside the label (e.g. 'fa-inbox')
         */
        icon?: string
        /**
         * sort weight for the entry
         */
        order?: number
        /**
         * id of the content widget (resolved via resourcesRefs, RBAC-aware). Optional — omit to use the path → flexes/page-<slug> convention.
         */
        resourceRefId?: string
        /**
         * convention page-slug override → content is flexes/page-<slug>; set this for templated paths to avoid list-vs-detail collisions.
         */
        page?: string
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
