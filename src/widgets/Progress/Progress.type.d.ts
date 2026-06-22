export interface Progress {
  version: string
  /**
   * Progress displays the completion status of an operation as a line, circle or dashboard gauge
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * the completion percentage (0-100)
       */
      percent: number
      /**
       * the visual type of the progress indicator
       */
      type?: 'line' | 'circle' | 'dashboard'
      /**
       * the status of the progress indicator
       */
      status?: 'success' | 'exception' | 'normal' | 'active'
      /**
       * the color of the progress stroke
       */
      strokeColor?: 'blue' | 'darkBlue' | 'orange' | 'gray' | 'red' | 'green' | 'violet'
      /**
       * whether to display the progress value text
       */
      showInfo?: boolean
      /**
       * the size of the progress indicator
       */
      size?: 'default' | 'small'
      /**
       * render the progress as a discrete number of steps
       */
      steps?: number
      /**
       * optional primary readout rendered below the indicator, tinted in the strokeColor
       */
      label?: string
      /**
       * optional secondary readout (muted graphite) rendered under `label`
       */
      description?: string
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
