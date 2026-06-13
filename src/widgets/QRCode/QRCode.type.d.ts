export interface QRCode {
  /**
   * QRCode renders a scannable QR code for a value
   */
  kind: string
  spec: {
    apiRef?: {
      name: string
      namespace: string
    }
    widgetData: {
      /**
       * the encoded value
       */
      value: string
      /**
       * the size in pixels
       */
      size?: number
      /**
       * whether to draw a border
       */
      bordered?: boolean
    }
    widgetDataTemplate?: {
      expression?: string
      forPath?: string
    }[]
  }
  version: string
}
