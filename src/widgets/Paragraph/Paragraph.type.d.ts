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
