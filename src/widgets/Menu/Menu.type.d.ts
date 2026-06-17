export interface Menu {
  version: string
  /**
   * antd Menu — navigation. `items` are inline nav entries (folded NavMenuItem data) referencing the content widget by resourceRefId; entries without icon/label/path are NavMenuItem CR references (back-compat).
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
       * navigation entries; inline nav data (folded NavMenuItem) referencing the content widget by resourceRefId. Entries without icon/label/path are treated as NavMenuItem CR references (back-compat).
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
