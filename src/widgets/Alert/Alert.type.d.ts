export interface Alert {
  /**
   * Alert displays an inline contextual message
   */
  kind: string
  spec: {
    apiRef?: {
      name: string
      namespace: string
    }
    widgetData: {
      /**
       * the alert title
       */
      message: string
      /**
       * the alert detail text
       */
      description?: string
      /**
       * the alert severity
       */
      type?: 'success' | 'info' | 'warning' | 'error'
      /**
       * whether to show the severity icon
       */
      showIcon?: boolean
      /**
       * render as a full-width banner
       */
      banner?: boolean
      /**
       * whether the alert can be dismissed
       */
      closable?: boolean
    }
    widgetDataTemplate?: {
      expression?: string
      forPath?: string
    }[]
  }
  version: string
}
