export interface Upload {
  version: string
  /**
   * Upload lets the user select files and uploads them to a resolved backend endpoint (resourceRefId) with the current bearer token
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * the id of the resourceRef (in resourcesRefs) describing the upload target endpoint
       */
      resourceRefId: string
      /**
       * the label shown on the upload control
       */
      label?: string
      /**
       * antd Upload `name` — the multipart form field name for the file (defaults to `file`); legacy `fieldName` still accepted
       */
      name?: string
      /**
       * how the uploaded file list is rendered
       */
      listType?: 'text' | 'picture' | 'picture-card' | 'picture-circle'
      /**
       * the accepted file types (the input `accept` attribute, eg: `.json,.yaml`)
       */
      accept?: string
      /**
       * whether multiple files can be selected
       */
      multiple?: boolean
      /**
       * whether to allow selecting an entire directory
       */
      directory?: boolean
      /**
       * the maximum number of files allowed
       */
      maxCount?: number
      /**
       * message displayed in a toast after a successful upload
       */
      successMessage?: string
      /**
       * message displayed in a toast when an upload fails
       */
      errorMessage?: string
    }
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
        [k: string]: unknown
      }[]
      [k: string]: unknown
    }
    apiRef?: {
      name: string
      namespace: string
    }
    widgetDataTemplate?: {
      forPath?: string
      expression?: string
    }[]
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
