export interface Markdown {
  version: string
  /**
   * Markdown receives markdown in string format and renders it gracefully
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * displays a copy button on top of the widget to allow copy to clipboard
       */
      allowCopy?: boolean
      /**
       * displays a download button on top of the widget to allow download of the text
       */
      allowDownload?: boolean
      /**
       * if 'allowDownload' is set, this property allows to set an extension for the downloaded file. Default is .txt
       */
      downloadFileExtension?: string
      /**
       * markdown string to be displayed
       */
      markdown: string
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
