export interface Badge {
  /**
   * Badge shows a small count or status dot
   */
  kind: string
  spec: {
    apiRef?: {
      name: string
      namespace: string
    }
    widgetData: {
      /**
       * the number shown in the badge
       */
      count?: number
      /**
       * the text shown next to a status dot
       */
      text?: string
      /**
       * the status style
       */
      status?: 'success' | 'processing' | 'default' | 'error' | 'warning'
      /**
       * whether to show the badge when count is zero
       */
      showZero?: boolean
      /**
       * render a dot instead of a count
       */
      dot?: boolean
    }
    widgetDataTemplate?: {
      expression?: string
      forPath?: string
    }[]
  }
  version: string
}
