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
       * map each colorField category to a Krateo palette color name (e.g. {"Healthy":"green","Failed":"red"}); sets the G2 color scale domain/range for semantic slice colors
       */
      colorMap?: {
        [k: string]: string
      }
      /**
       * donut hole as a percentage of the radius, 0-100 (maps to antd Pie `innerRadius` ÷ 100); omit for a full pie
       */
      innerRadius?: number
      /**
       * show the legend; false hides it (G2 `legend`). When shown it is rendered centered, positioned per legendPosition (default below the chart).
       */
      legend?: boolean
      /**
       * where the legend sits relative to the chart (G2 legend position). Default bottom; right stacks it beside the donut (status-breakdown layout)
       */
      legendPosition?: 'bottom' | 'right' | 'top' | 'left'
      /**
       * per-slice label config passed through to G2 (e.g. {"text":"count","position":"inside"}); omit for no slice labels
       */
      label?: {
        [k: string]: unknown
      }
      /**
       * G2 annotations passed through (e.g. a donut center `text` annotation positioned at x/y 50%)
       */
      annotations?: {
        [k: string]: unknown
      }[]
      /**
       * chart title (G2 `title`)
       */
      title?: string
      /**
       * fixed height in px (G2 `height`); omit to autofit
       */
      height?: number
      /**
       * live-refresh watch: involvedObject(s) this widget is tied to (see src/schemas/watch.schema.json). A matching k8s event refetches the widget.
       */
      watch?: {
        /**
         * group/version, e.g. composition.krateo.io/v1alpha1
         */
        apiVersion: string
        /**
         * e.g. DemoClaim
         */
        kind: string
        /**
         * scope to a namespace; omit to match any
         */
        namespace?: string
        /**
         * a specific object; omit to match any object of this kind ("GVR-level")
         */
        name?: string
      }[]
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
