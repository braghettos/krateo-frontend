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
       * G2 annotation marks passed through (e.g. a peak `point` marker + a dashed `lineX` "now" line); usually computed server-side via a widgetDataTemplate
       */
      annotations?: {
        [k: string]: unknown
      }[]
      /**
       * render a default circle marker at each data point (G2 composed `point` mark). Improves legibility of sparse series.
       */
      point?: boolean
      /**
       * G2 per-channel scale config (G2 `scale`), e.g. {"y":{"zero":true,"nice":true,"domainMin":0,"domainMax":3,"tickCount":4}}. domainMax is a floor — data larger than it still wins, so dense data is never clipped.
       */
      scale?: {
        [k: string]: unknown
      }
      /**
       * G2 per-channel axis config (G2 `axis`), e.g. {"x":{"tickCount":6},"y":{"tickCount":4}}
       */
      axis?: {
        [k: string]: unknown
      }
      /**
       * When set, `xField` values are treated as UNIX epoch SECONDS and formatted to a label in the BROWSER's local timezone at render: 'hour' -> 'HH:00', 'day' -> 'Mon D'. Use this instead of server-side strftime so a 21:00-Rome bucket reads 21:00 (not the server's UTC 19:00). Annotations sharing `xField` are localized identically so peak/now marks stay aligned.
       */
      xTimeUnit?: 'hour' | 'day'
      /**
       * map each colorField category to a Krateo palette colour name (e.g. {"Created":"cyan"}); sets the G2 color scale domain/range so the line + points render in the brand colour, not G2's default blue palette
       */
      colorMap?: {
        [k: string]: string
      }
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
        allowed?: boolean
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
