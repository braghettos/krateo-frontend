export interface Switch {
  version: string
  /**
   * Switch is a form-control widget wrapping Ant Design Switch. It renders inside a Form widget's context and binds its boolean value by `name`.
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * form field key — antd Form.Item `name`
       */
      name: string
      /**
       * antd Form.Item `label`
       */
      label?: string
      /**
       * initial checked state — antd Form.Item `initialValue`
       */
      defaultChecked?: boolean
      /**
       * antd Switch `disabled`
       */
      disabled?: boolean
      /**
       * antd Switch `size`
       */
      size?: 'default' | 'small'
      /**
       * antd Switch `checkedChildren` (on-state label)
       */
      checkedChildren?: string
      /**
       * antd Switch `unCheckedChildren` (off-state label)
       */
      unCheckedChildren?: string
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
