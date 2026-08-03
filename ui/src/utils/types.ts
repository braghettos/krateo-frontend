import type { EventV1 } from '../types/k8s/event.type'
import type { WidgetActions } from '../types/Widget'
interface JSONSchemaProperty {
  type?: string | string[]
  description?: string
  enum?: string[]
  items?: JSONSchemaPropertyOrContainer
}

type JSONSchemaPropertyOrContainer = JSONSchemaProperty & Partial<WidgetDataSchema>

export interface WidgetDataSchema {
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
}

interface WidgetActionsSchema {
  properties?: Record<string, WidgetActions>
  required?: string[]
}

export interface JSONSchema {
  title?: string
  description?: string
  properties?: {
    spec?: {
      properties?: {
        actions?: WidgetActionsSchema
        widgetData?: WidgetDataSchema
      }
    }
    kind?: {
      default?: string
      description?: string
    }
  }
}

export type SSEK8sEvent = EventV1

export type RestApiResponse = {
  status?: string | number
  reason?: string
  message?: string
  metadata?: {
    name?: string
    namespace?: string
    uid?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface Payload {
  metadata?: {
    name?: string
    namespace?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}
