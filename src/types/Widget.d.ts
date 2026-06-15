export interface ResourceRef {
  allowed: boolean
  id: string
  path: string
  verb: 'GET' | 'POST' | 'DELETE' | 'PATCH' | 'PUT'
  payload: object
}

export type ResourcesRefs = {
  items: ResourceRef[]
  slice?: {
    page: number
    perPage: number
    continue: boolean
  }
}

export interface Widget<WidgetDataType = unknown> {
  apiVersion: string
  kind: string
  code?: number
  message?: string
  reason?: string
  metadata: {
    annotations: object
    creationTimestamp: string
    generation: number
    name: string
    namespace: string
    resourceVersion: string
    uid: string
  }
  spec: {
    actions: WidgetActions
    widgetData: WidgetDataType
    resourcesRefs: ResourcesRefs
  }
  status:
    | {
        actions: WidgetActions
        widgetData: WidgetDataType
        resourcesRefs?: ResourcesRefs
      }
    | string
}

export type WidgetActions = {
  rest?: {
    type: 'rest'
    id: string
    payload?: Record<string, unknown>
    resourceRefId: string
    requireConfirmation?: boolean
    successMessage?: string
    errorMessage?: string
    onSuccessNavigateTo?: string
    onEventNavigateTo?: {
      url: string
      eventReason: string
      timeout?: number
      reloadRoutes?: boolean
      loadingMessage?: string
    }
    payloadToOverride?: {
      name: string
      value: string
    }[]
    headers?: string[]
    loading?: {
      display: boolean
    }
  }[]
  navigate?: {
    id: string
    loading?: {
      display: boolean
    }
    path?: string
    resourceRefId?: string
    requireConfirmation?: boolean
    type: 'navigate'
  }[]
  openDrawer?: {
    id: string
    type: 'openDrawer'
    resourceRefId: string
    requireConfirmation?: boolean
    size?: 'default' | 'large'
    title?: string
    loading?: {
      display: boolean
    }
  }[]
  openModal?: {
    id: string
    type: 'openModal'
    resourceRefId: string
    requireConfirmation?: boolean
    title?: string
    loading?: {
      display: boolean
    }
    customWidth?: string
    size?: 'custom' | 'default' | 'fullscreen' | 'large'
  }[]
}

type RestAction = NonNullable<WidgetActions['rest']>[number]
type NavigateAction = NonNullable<WidgetActions['navigate']>[number]
type OpenDrawerAction = NonNullable<WidgetActions['openDrawer']>[number]
type OpenModalAction = NonNullable<WidgetActions['openModal']>[number]

export type WidgetAction = RestAction | NavigateAction | OpenDrawerAction | OpenModalAction

export type WidgetProps<T = unknown> = {
  resourcesRefs: ResourcesRefs
  uid: string
  widgetData: T
  widget?: Widget
}
