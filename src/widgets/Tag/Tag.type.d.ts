export interface Tag {
  /**
   * Tag displays a small categorical label
   */
  kind: string
  spec: {
    apiRef?: {
      name: string
      namespace: string
    }
    widgetData: {
      /**
       * the tag text
       */
      label: string
      /**
       * the tag color (preset name or hex)
       */
      color?: string
      /**
       * antd Tag variant
       */
      variant?: 'filled' | 'solid' | 'outlined'
    }
    widgetDataTemplate?: {
      expression?: string
      forPath?: string
    }[]
  }
  version: string
}
