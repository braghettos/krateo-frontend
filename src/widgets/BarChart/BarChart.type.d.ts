export interface BarChart {
  version: string
  /**
   * BarChart wraps the @ant-design/charts Column component (AntV G2 — vertical bars). It mirrors that library's data + field-mapping API.
   */
  kind: string
  spec: {
    /**
     * @ant-design/charts Column config (AntV G2)
     */
    widgetData: {
      /**
       * chart data records (G2 `data`)
       */
      data: {
        [k: string]: unknown
      }[]
      /**
       * field mapped to the category axis (G2 `xField`)
       */
      xField: string
      /**
       * field mapped to the value axis (G2 `yField`)
       */
      yField: string
      /**
       * field mapped to color / series (G2 `colorField`)
       */
      colorField?: string
      /**
       * stack series sharing an x value (G2 `stack`)
       */
      stack?: boolean
      /**
       * group series side-by-side at each x value (G2 `group`)
       */
      group?: boolean
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
