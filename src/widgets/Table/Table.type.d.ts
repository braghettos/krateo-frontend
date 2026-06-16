export interface Table {
  version: string
  /**
   * Table displays structured data with customizable columns and pagination
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * the list of resources that are allowed to be children of this widget or referenced by it
       */
      allowedResources: (
        | 'barcharts'
        | 'buttons'
        | 'buttongroups'
        | 'filters'
        | 'flowcharts'
        | 'linecharts'
        | 'markdowns'
        | 'paragraphs'
        | 'piecharts'
        | 'yamlviewers'
      )[]
      /**
       * configuration of the table's columns
       */
      columns: {
        /**
         * the color of the value (or the icon) to be represented
         */
        color?: 'blue' | 'darkBlue' | 'orange' | 'gray' | 'red' | 'green' | 'violet'
        /**
         * column header label
         */
        title: string
        /**
         * key used to extract the value from row data
         */
        valueKey: string
      }[]
      /**
       * antd Table dataSource — the table rows (renamed from `data`; `data` still accepted for back-compat)
       */
      dataSource?: {
        /**
         * the key of the column this cell belongs to
         */
        valueKey: string
        /**
         * type of cell value
         */
        kind: 'jsonSchemaType' | 'icon' | 'widget'
        /**
         * used if kind = widget
         */
        resourceRefId?: string
        /**
         * used if kind = jsonSchemaType
         */
        type?: 'string' | 'number' | 'integer' | 'decimal' | 'boolean' | 'array' | 'null'
        /**
         * value if type = string
         */
        stringValue?: string
        /**
         * value if type = number or integer
         */
        numberValue?: number
        /**
         * value if type = number or decimal
         */
        decimalValue?: string
        /**
         * value if type = boolean
         */
        booleanValue?: boolean
        /**
         * value if type = array
         */
        arrayValue?: string[]
      }[][]
      /**
       * antd Table pagination config (subproperties mirror antd).
       */
      pagination?: {
        /**
         * number of rows per page
         */
        pageSize?: number
        /**
         * default page size
         */
        defaultPageSize?: number
        /**
         * hide the pager when there is a single page
         */
        hideOnSinglePage?: boolean
        /**
         * use the simple pager
         */
        simple?: boolean
        /**
         * pager position(s)
         */
        position?: ('topLeft' | 'topCenter' | 'topRight' | 'bottomLeft' | 'bottomCenter' | 'bottomRight')[]
      }
      /**
       * antd Table bordered
       */
      bordered?: boolean
      /**
       * antd Table size
       */
      size?: 'large' | 'middle' | 'small'
      /**
       * it's the filters prefix to get right values
       */
      prefix?: string
    }
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
