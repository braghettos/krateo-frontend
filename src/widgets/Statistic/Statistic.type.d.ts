export interface Statistic {
  /**
   * Statistic highlights a single numeric value
   */
  kind: string
  spec: {
    apiRef?: {
      name: string
      namespace: string
    }
    widgetData: {
      /**
       * the statistic label
       */
      title?: string
      /**
       * the statistic value
       */
      value: number | string
      /**
       * the number of decimal places
       */
      precision?: number
      /**
       * text shown before the value
       */
      prefix?: string
      /**
       * text shown after the value
       */
      suffix?: string
    }
    widgetDataTemplate?: {
      expression?: string
      forPath?: string
    }[]
  }
  version: string
}
