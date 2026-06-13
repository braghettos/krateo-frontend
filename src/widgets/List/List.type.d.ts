export interface List {
  version: string
  /**
   * List renders an array of items, following the Ant Design List API (grid, itemLayout, size, bordered, split, header, footer). Each dataSource element is rendered via itemTemplate, or as a child widget when it carries a resourceRefId. Supersedes DataGrid.
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * antd List grid layout (ListGridType); presence enables grid mode
       */
      grid?: {
        gutter?: number
        column?: number
        xs?: number
        sm?: number
        md?: number
        lg?: number
        xl?: number
        xxl?: number
      }
      /**
       * antd List itemLayout
       */
      itemLayout?: 'horizontal' | 'vertical'
      /**
       * antd List size
       */
      size?: 'default' | 'large' | 'small'
      /**
       * antd List bordered
       */
      bordered?: boolean
      /**
       * antd List split
       */
      split?: boolean
      /**
       * antd List loading
       */
      loading?: boolean
      /**
       * antd List header (ReactNode in antd; string here)
       */
      header?: string
      /**
       * antd List footer (ReactNode in antd; string here)
       */
      footer?: string
      /**
       * antd List dataSource. Each element is a data object (rendered via itemTemplate) or { resourceRefId } (rendered as a child widget).
       */
      dataSource?: {
        [k: string]: unknown
      }[]
      /**
       * serializable substitute for antd renderItem: maps a data element's fields to row slots ({dot.path}; {a|b} first-non-empty)
       */
      itemTemplate?: {
        primaryText?: string
        secondaryText?: string
        subPrimaryText?: string
        subSecondaryText?: string
        icon?: string
        color?: {
          value?: string
          map?: {
            [k: string]: string
          }
          default?: string
        }
        formats?: {
          primaryText?: 'text' | 'datetime'
          secondaryText?: 'text' | 'datetime'
          subPrimaryText?: 'text' | 'datetime'
          subSecondaryText?: 'text' | 'datetime'
        }
      }
      /**
       * optional SSE endpoint to stream items from (Krateo extension)
       */
      sseEndpoint?: string
      /**
       * optional SSE subscription topic (Krateo extension)
       */
      sseTopic?: string
      /**
       * Filters prefix (Krateo extension)
       */
      prefix?: string
      /**
       * max items kept when streaming (Krateo extension, default 200)
       */
      maxItems?: number
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
