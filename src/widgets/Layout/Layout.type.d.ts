export interface Layout {
  version: string
  /**
   * Layout wraps the Ant Design Layout component: optional Header, Sider, Content and Footer regions, each rendering a child widget. The Sider exposes antd's collapse/responsive props.
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * antd Layout `hasSider` — declares a Sider child so the flex direction is correct on first paint
       */
      hasSider?: boolean
      /**
       * resourceRefId of the widget rendered in antd Layout.Header
       */
      header?: string
      /**
       * resourceRefId of the widget rendered in antd Layout.Content
       */
      content?: string
      /**
       * resourceRefId of the widget rendered in antd Layout.Footer
       */
      footer?: string
      /**
       * antd Layout.Sider region
       */
      sider?: {
        /**
         * resourceRefId of the widget rendered inside the Sider
         */
        resourceRefId?: string
        /**
         * antd Sider `width` in px
         */
        width?: number
        /**
         * antd Sider `collapsible` (renders a collapse trigger)
         */
        collapsible?: boolean
        /**
         * antd Sider `collapsedWidth` in px
         */
        collapsedWidth?: number
        /**
         * antd Sider responsive `breakpoint`; auto-collapses below it
         */
        breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
        /**
         * antd Sider `theme`
         */
        theme?: 'light' | 'dark'
        /**
         * antd Sider `defaultCollapsed`
         */
        defaultCollapsed?: boolean
        /**
         * antd Sider `reverseArrow`
         */
        reverseArrow?: boolean
      }
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
