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
       * the layout direction of the steps
       */
      direction?: 'horizontal' | 'vertical'
      /**
       * the size of the steps
       */
      size?: 'default' | 'small'
      /**
       * the status of the current step
       */
      status?: 'wait' | 'process' | 'finish' | 'error'
      /**
       * where the label is placed relative to the step icon
       */
      labelPlacement?: 'horizontal' | 'vertical'
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
  }
}
