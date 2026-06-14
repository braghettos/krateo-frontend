export interface PieChart {
  version: string
  /**
   * PieChart wraps the @ant-design/charts Pie component (AntV G2). It mirrors that library's data + field-mapping API.
   */
  kind: string
  spec: {
    /**
     * @ant-design/charts Pie config (AntV G2)
     */
    widgetData: {
      /**
       * chart data records (G2 `data`)
       */
      data: {
        [k: string]: unknown
      }[]
      /**
       * field mapped to the slice value / angle (G2 `angleField`)
       */
      angleField: string
      /**
       * field mapped to color / category (G2 `colorField`)
       */
      colorField: string
      /**
       * show the legend; false hides it (G2 `legend`)
       */
      legend?: boolean
      /**
       * chart title (G2 `title`)
       */
      title?: string
      /**
       * fixed height in px (G2 `height`); omit to autofit
       */
      height?: number
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
