export interface NavMenuItem {
  version: string
  /**
   * NavMenuItem represents a single item in the navigation menu and links to a specific resource and route in the application
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * the list of resources that are allowed to be children of this widget or referenced by it
       */
      allowedResources: 'pages'[]
      /**
       * name of the icon to display alongside the label (font awesome icon name eg: `fa-inbox`)
       */
      icon: string
      /**
       * text displayed as the menu item's label
       */
      label: string
      /**
       * a weight to be used to sort the items in the menu
       */
      order?: number
      /**
       * route path to navigate to when the menu item is clicked
       */
      path: string
      /**
       * the identifier of the k8s custom resource that should be represented, usually a widget
       */
      resourceRefId: string
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
