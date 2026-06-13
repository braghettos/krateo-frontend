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
