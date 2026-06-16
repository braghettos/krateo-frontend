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
       * donut hole as a percentage of the radius, 0-100 (maps to antd Pie `innerRadius` ÷ 100); omit for a full pie
       */
      innerRadius?: number
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
    resourcesRefs?: {
      items: {
        allowed: boolean
        apiVersion?: string
        id: string
        name?: string
        namespace?: string
        payload?: {
          [k: string]: unknown
        }
        resource?: string
        verb?: 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GET'
        slice?: {
          offset?: number
          page: number
          perPage: number
          continue?: boolean
          [k: string]: unknown
        }
        [k: string]: unknown
      }[]
      [k: string]: unknown
    }
    resourcesRefsTemplate?: {
      iterator?: string
      template?: {
        apiVersion?: string
        id?: string
        name?: string
        namespace?: string
        payload?: {
          [k: string]: unknown
        }
        resource?: string
        verb?: 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GET'
      }
    }[]
  }
}
