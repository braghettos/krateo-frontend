export interface AppShell {
  version: string
  /**
   * AppShell is the portal layout: a sidebar (logo + nav) and a header (left/right slots) around a central content area. Each slot references a child widget.
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * the logo image URL shown at the top of the sidebar
       */
      logoSrc?: string
      /**
       * resourceRefId of the widget rendered in the sidebar (typically a NavMenu)
       */
      sidebar?: string
      /**
       * resourceRefIds of the widgets rendered on the left of the header
       */
      headerLeft?: string[]
      /**
       * resourceRefIds of the widgets rendered on the right of the header
       */
      headerRight?: string[]
      /**
       * resourceRefId of the widget rendered in the central content area
       */
      content?: string
    }
    resourcesRefs?: {
      items: {
        allowed: boolean
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
  }
}
