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
         * id of the content widget to navigate to (resolved via resourcesRefs); or a NavMenuItem CR in back-compat mode
         */
        resourceRefId: string
        /**
         * FontAwesome icon name shown beside the label (e.g. 'fa-inbox')
         */
        icon?: string
        /**
         * menu entry label
         */
        label?: string
        /**
         * route path to navigate to on click
         */
        path?: string
        /**
         * sort weight for the entry
         */
        order?: number
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
  }
}
