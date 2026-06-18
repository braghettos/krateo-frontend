export interface Paragraph {
  version: string
  /**
   * Paragraph is a simple component used to display a block of text
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * the content of the paragraph (the antd Typography children, as text)
       */
      text: string
      /**
       * when set, render as an antd Typography.Title heading of this level (h1-h5) instead of a body paragraph
       */
      level?: 1 | 2 | 3 | 4 | 5
      /**
       * antd Typography type
       */
      type?: 'secondary' | 'success' | 'warning' | 'danger'
      /**
       * antd Typography strong
       */
      strong?: boolean
      /**
       * antd Typography italic
       */
      italic?: boolean
      /**
       * antd Typography underline
       */
      underline?: boolean
      /**
       * antd Typography delete (strikethrough)
       */
      delete?: boolean
      /**
       * antd Typography code
       */
      code?: boolean
      /**
       * antd Typography mark (highlight)
       */
      mark?: boolean
      /**
       * antd Typography disabled
       */
      disabled?: boolean
      /**
       * antd Typography copyable
       */
      copyable?: boolean
      /**
       * antd Typography ellipsis
       */
      ellipsis?: boolean
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
