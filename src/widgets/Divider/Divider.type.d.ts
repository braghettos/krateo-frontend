export interface Divider {
  /**
   * Divider separates content with a horizontal rule and optional label
   */
  kind: string
  spec: {
    apiRef?: {
      name: string
      namespace: string
    }
    widgetData: {
      /**
       * optional text shown on the divider
       */
      label?: string
      /**
       * where the label sits (antd Divider `titlePlacement`; antd 6 renamed from `orientation`)
       */
      titlePlacement?: 'left' | 'right' | 'center'
      /**
       * render a dashed line
       */
      dashed?: boolean
      /**
       * render the label in a plain (non-bold) style
       */
      plain?: boolean
    }
    widgetDataTemplate?: {
      expression?: string
      forPath?: string
    }[]
  }
  version: string
}
