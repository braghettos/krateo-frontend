export interface Result {
  /**
   * Result shows the outcome of an operation with a status icon
   */
  kind: string
  spec: {
    apiRef?: {
      name: string
      namespace: string
    }
    widgetData: {
      /**
       * the result status
       */
      status?: 'success' | 'error' | 'info' | 'warning'
      /**
       * the result title
       */
      title?: string
      /**
       * the result detail text
       */
      subTitle?: string
    }
    widgetDataTemplate?: {
      expression?: string
      forPath?: string
    }[]
  }
  version: string
}
