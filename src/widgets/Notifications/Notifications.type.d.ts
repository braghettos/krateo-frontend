export interface Notifications {
  version: string
  /**
   * Notifications renders the events Server-Sent-Events stream as a bell badge that opens a drawer list. Place it in a header slot of an AppShell.
   */
  kind: string
  spec: {
    widgetData: {
      /**
       * the Server-Sent-Events topic to subscribe to (default `krateo`)
       */
      topic?: string
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
