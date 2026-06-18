export interface LineChart {
  version: string
  /**
   * LineChart wraps the @ant-design/charts Line component (AntV G2). It mirrors that library's data + field-mapping API: pass a flat `data` array and map fields to positions/color.
   */
  kind: string
  spec: {
    /**
     * @ant-design/charts Line config (AntV G2)
     */
    widgetData: {
      /**
       * chart data records (G2 `data`)
       */
      data: {
        [k: string]: unknown
      }[]
      /**
       * field mapped to the x position (G2 `xField`)
       */
      xField: string
      /**
       * field mapped to the y position (G2 `yField`)
       */
      yField: string
      /**
       * field mapped to color / series (G2 `colorField`)
       */
      colorField?: string
      /**
       * line shape, e.g. 'smooth' or 'line' (G2 `shapeField`)
       */
      shapeField?: string
      /**
       * stack the series (G2 `stack`)
       */
      stack?: boolean
      /**
       * render a gradient area fill under the line (G2 `area`); defaults to false
       */
      area?: boolean
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
