export interface List {
  version: string
  /**
   * List renders any array of items as rows, mapping each item's fields to row slots via itemTemplate. Optionally streams items from a Server-Sent-Events source.
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * the items to render (free-form objects); may also be appended from the SSE source
       */
      items?: {
        [k: string]: unknown
      }[]
      /**
       * maps each item's fields to row slots; slot values are templates with {dot.path} placeholders ({a|b} picks the first non-empty)
       */
      itemTemplate: {
        /**
         * the main row text
         */
        primaryText?: string
        /**
         * the right-aligned row text (e.g. a timestamp)
         */
        secondaryText?: string
        /**
         * secondary text under the primary text
         */
        subPrimaryText?: string
        /**
         * secondary text above the secondary text
         */
        subSecondaryText?: string
        /**
         * font awesome icon name, or a {path}
         */
        icon?: string
        /**
         * row avatar color
         */
        color?: {
          /**
           * a palette color name, or a {path} resolved against the item
           */
          value?: string
          /**
           * map a resolved value to a palette color, e.g. { Normal: blue, Warning: orange }
           */
          map?: {
            [k: string]: string
          }
          /**
           * fallback palette color
           */
          default?: string
        }
        /**
         * per-slot value formatting
         */
        formats?: {
          primaryText?: 'text' | 'datetime'
          secondaryText?: 'text' | 'datetime'
          subPrimaryText?: 'text' | 'datetime'
          subSecondaryText?: 'text' | 'datetime'
        }
      }
      /**
       * optional Server-Sent-Events endpoint to stream items from
       */
      sseEndpoint?: string
      /**
       * optional Server-Sent-Events subscription topic
       */
      sseTopic?: string
      /**
       * filter prefix used to filter items via the Filters widget
       */
      prefix?: string
      /**
       * the maximum number of items to keep when streaming (default 200)
       */
      maxItems?: number
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
