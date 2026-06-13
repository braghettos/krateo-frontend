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
       * whether the tag has a border
       */
      bordered?: boolean
    }
    widgetDataTemplate?: {
      expression?: string
      forPath?: string
    }[]
  }
  version: string
}
