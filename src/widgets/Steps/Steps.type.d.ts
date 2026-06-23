export interface Steps {
  version: string
  /**
   * Steps displays a sequence of numbered steps that guide the user through a process
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * the index of the current step (0-based)
       */
      current?: number
      /**
       * the layout orientation of the steps (antd Steps `orientation`)
       */
      orientation?: 'horizontal' | 'vertical'
      /**
       * the size of the steps
       */
      size?: 'default' | 'small'
      /**
       * the status of the current step
       */
      status?: 'wait' | 'process' | 'finish' | 'error'
      /**
       * where the title is placed relative to the step icon (antd Steps `titlePlacement`)
       */
      titlePlacement?: 'horizontal' | 'vertical'
      /**
       * the visual type of the steps
       */
      type?: 'default' | 'navigation' | 'inline'
      /**
       * the steps to display
       */
      items: {
        /**
         * the title of the step
         */
        title: string
        /**
         * a short "eyebrow" label shown ABOVE the title (e.g. `Step 1`) — rendered mono/uppercase
         */
        eyebrow?: string
        /**
         * the description of the step
         */
        description?: string
        /**
         * the subtitle of the step
         */
        subTitle?: string
        /**
         * the status of this step
         */
        status?: 'wait' | 'process' | 'finish' | 'error'
        /**
         * a font awesome icon name for the step (eg: `fa-user`)
         */
        icon?: string
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
