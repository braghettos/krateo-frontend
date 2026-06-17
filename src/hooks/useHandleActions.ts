import { useQueryClient } from '@tanstack/react-query'
import useApp from 'antd/es/app/useApp'
import { merge, set } from 'lodash'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { useConfigContext } from '../context/ConfigContext'
import { useRoutesContext } from '../context/RoutesContext'
import type { ResourcesRefs, Widget, WidgetAction } from '../types/Widget'
import { getAccessToken } from '../utils/getAccessToken'
import { useResolveJqExpression } from '../utils/jq-expression'
import type { Payload, RestApiResponse } from '../utils/types'
import { getHeadersObject, getResourceRef } from '../utils/utils'
import { closeDrawer, openDrawer } from '../widgets/Drawer/Drawer'
import { openModal } from '../widgets/Modal/Modal'

interface EventData {
  involvedObject: {
    uid: string
  }
  reason: string
}

/**
 * Interpolates a route template using values from a nested payload object.
 * Placeholders in the route must follow the format `${path.to.value}`.
 * If any placeholder cannot be resolved or is not a primitive, the function returns null.
 *
 * Example:
 *   interpolateRedirectUrl({ user: { id: 123 } }, "/profile/${user.id}")
 *   → "/profile/123"
 *
 * @param payload - The object used to resolve placeholders (supports nested values)
 * @param route - The route string containing `${...}` placeholders to be replaced
 * @returns The interpolated route string or null if a placeholder could not be resolved
 */
const interpolateRedirectUrl = (payload: Record<string, unknown>, route: string): string | null => {
  let allReplacementsSuccessful = true

  const interpolatedRoute = route.replace(/\$\{([^}]+)\}/g, (_, key: string) => {
    const parts = key.split('.')

    let value: unknown = payload
    for (const part of parts) {
      if (typeof value === 'object' && value !== null && Object.prototype.hasOwnProperty.call(value, part)) {
        value = (value as Record<string, unknown>)[part]
      } else {
        value = undefined
        break
      }
    }

    if (
      typeof value === 'string'
      || typeof value === 'number'
      || typeof value === 'boolean'
      || typeof value === 'bigint'
      || typeof value === 'symbol'
    ) {
      return String(value)
    }

    allReplacementsSuccessful = false
    return ''
  })

  return allReplacementsSuccessful ? interpolatedRoute : null
}

/**
 * Adds or replaces `name` and `namespace` query parameters in a given URL.
 * Existing `name` and `namespace` parameters (if any) are removed before appending the new values.
 *
 * Example:
 *   updateNameNamespace("/api?foo=bar&name=old", "my-app", "prod")
 *   → "/api?foo=bar&name=my-app&namespace=prod"
 *
 * @param path - The original URL (may already include query parameters)
 * @param name - The new `name` parameter to set
 * @param namespace - The new `namespace` parameter to set
 * @returns The updated URL with the new query parameters
 */
const updateNameNamespace = (path: string, name?: string, namespace?: string) => {
  const [base, queryString = ''] = path.split('?')
  const qsParameters = queryString
    .split('&')
    .filter((el) => !el.startsWith('name=') && !el.startsWith('namespace='))
    .join('&')

  return `${base}?${qsParameters ? `${qsParameters}&` : ''}name=${name}&namespace=${namespace}`
}

const buildPayload = async (
  action: WidgetAction & {type: 'rest'},
  resourcePayload: object,
  customPayload: Record<string, unknown> | undefined,
  resolveJq: (expression: string, values: Record<string, unknown>) => Promise<string>
): Promise<Payload> => {
  const { payload, payloadToOverride } = action
  // 1. the action payload is the starting object
  let finalPayload = payload ?? {}

  // 2. the action payload and the referenced resource payload are merged
  finalPayload = merge({}, payload, resourcePayload)

  if (payloadToOverride && payloadToOverride.length > 0 && customPayload) {
    // 3. the values defined in payloadToOverride are interpolated
    const overridePromises = payloadToOverride.map(async ({ name, value }) => {
      let resolvedValue: unknown = value

      if (typeof value === 'string' && value.startsWith('${')) {
        resolvedValue = await resolveJq(value, { json: customPayload })
      }

      return { name, resolvedValue }
    })

    const resolvedOverrides = await Promise.all(overridePromises)

    // 4. the interpolated values replace the original values
    for (const { name, resolvedValue } of resolvedOverrides) {
      set(finalPayload, name, resolvedValue)
    }
  }

  return finalPayload
}

export const useHandleAction = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message, notification } = useApp()
  const { config } = useConfigContext()
  const { reloadRoutes } = useRoutesContext()
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false)
  const resolveJq = useResolveJqExpression()

  const handleNavigate = async (requireConfirmation: boolean | undefined, path: string) => {
    if (!requireConfirmation || window.confirm('Are you sure?')) {
      await navigate(path)
    }
  }

  const handleAction = async (
    action: WidgetAction,
    resourcesRefs: ResourcesRefs,
    customPayload?: Record<string, unknown>,
    widget?: Widget
  ) => {
    if (action.loading?.display) {
      setIsActionLoading(true)
    }

    if (action.type === 'navigate' && action.path) {
      const updatedUrl = action.path.startsWith('${')
        ? await resolveJq(action.path, { widget })
        : action.path

      await handleNavigate(action.requireConfirmation, updatedUrl)
      setIsActionLoading(false)

      return
    }

    if (action.type === 'navigate') {
      // Navigation must target a real route via `path`. The legacy
      // resourceRefId → `?widgetEndpoint=` content-swap bypass is removed.
      message.destroy()
      notification.error({
        description: 'A navigate action must specify a `path` (the route to navigate to).',
        message: 'Error while executing the action',
        placement: 'bottomLeft',
      })
      setIsActionLoading(false)

      return
    }

    const resourceRef = action.resourceRefId ? getResourceRef(action.resourceRefId, resourcesRefs) : undefined

    if (!resourceRef) {
      message.destroy()
      notification.error({
        description: `The widget definition does not include a resource reference for resource (ID: ${action.resourceRefId})`,
        message: 'Error while executing the action',
        placement: 'bottomLeft',
      })

      return
    }

    const { path, payload: resourcePayload, verb } = resourceRef

    const url = config?.api.SNOWPLOW_API_BASE_URL + path

    try {
      const { requireConfirmation, type } = action

      switch (type) {
        case 'openDrawer': {
          const { size, title } = action

          setIsActionLoading(false)
          openDrawer({ size, title, widgetEndpoint: path })

          break
        }
        case 'openModal': {
          const { customWidth, size, title } = action

          setIsActionLoading(false)
          openModal({ customWidth, size, title, widgetEndpoint: path })

          break
        }
        case 'rest': {
          const {
            errorMessage,
            headers = [],
            onEventNavigateTo,
            onSuccessNavigateTo,
            successMessage,
          } = action

          let jsonResponse: RestApiResponse | null = null

          if (!requireConfirmation || window.confirm('Are you sure?')) {
            if (onSuccessNavigateTo && onEventNavigateTo) {
              message.destroy()
              notification.error({
                description: 'Action has defined both the "onSuccessNavigateTo" and "onEventNavigateTo" properties',
                message: 'Warning while executing the action',
                placement: 'bottomLeft',
              })

              setIsActionLoading(false)

              return
            }

            const payload = await buildPayload(action, resourcePayload, customPayload, resolveJq)

            let resourceUid: string | null = null
            let eventReceived = false
            if (onEventNavigateTo) {
              const eventsEndpoint = `${config!.api.EVENTS_PUSH_API_BASE_URL}/notifications`

              const eventSource = new EventSource(eventsEndpoint, {
                withCredentials: false,
              })

              let description = `Timeout waiting for event ${onEventNavigateTo.eventReason}`
              // eslint-disable-next-line max-depth
              if (errorMessage) {
                description = errorMessage.startsWith('${')
                  ? await resolveJq(errorMessage, {
                    json: payload,
                    response: jsonResponse,
                  })
                  : errorMessage
              }

              const timeoutId = setTimeout(() => {
                if (!eventReceived) {
                  setIsActionLoading(false)
                  eventSource.close()
                  notification.error({
                    description,
                    message: 'Error while executing the action',
                    placement: 'bottomLeft',
                  })
                }
                message.destroy()
              }, onEventNavigateTo.timeout! * 1000)

              const loadingMessage = onEventNavigateTo.loadingMessage
                ? await resolveJq(onEventNavigateTo.loadingMessage, { json: payload, response: jsonResponse })
                : 'Waiting for resource and redirecting...'

              message.loading(loadingMessage, onEventNavigateTo.timeout)

              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              eventSource.addEventListener('krateo', async (event) => {
                if (!resourceUid) {
                  return
                }

                const eventData = JSON.parse(event.data as string) as EventData
                if (eventData.reason === onEventNavigateTo.eventReason && eventData.involvedObject.uid === resourceUid) {
                  eventReceived = true

                  if (onEventNavigateTo.reloadRoutes !== false) {
                    void reloadRoutes()
                  }

                  eventSource.close()
                  clearTimeout(timeoutId)

                  const redirectUrl = await (async () => {
                    /* if it starts with ${ should be resolved by cassing JQ endpoint otherwise use legacy method */
                    if (onEventNavigateTo.url.startsWith('${')) {
                      return resolveJq(onEventNavigateTo.url, {
                        event: eventData as unknown as Record<string, unknown>,
                        json: payload,
                        response: jsonResponse,
                      })
                    }

                    if (customPayload) {
                      const url = interpolateRedirectUrl(customPayload, onEventNavigateTo.url)
                      return url
                    }

                    return onEventNavigateTo.url
                  })()

                  if (!redirectUrl) {
                    message.destroy()
                    notification.error({
                      description: 'Impossible to redirect, the route contains an undefined value',
                      message: 'Error while redirecting',
                      placement: 'bottomLeft',
                    })

                    return
                  }

                  let description = 'The action has been executed successfully'
                  if (successMessage) {
                    description = successMessage.startsWith('${')
                      ? await resolveJq(successMessage, {
                        event: eventData as unknown as Record<string, unknown>,
                        json: payload,
                        response: jsonResponse,
                      })
                      : successMessage
                  }

                  message.destroy()
                  notification.success({
                    description,
                    message: `Successfully executed action`,
                    placement: 'bottomLeft',
                  })

                  setIsActionLoading(false)
                  closeDrawer()
                  void navigate(redirectUrl)
                }
              })
            }

            const updatedUrl = customPayload
              ? updateNameNamespace(url, payload?.metadata?.name, payload?.metadata?.namespace)
              : url

            const headersObject = getHeadersObject(headers)
            if (!headersObject) {
              message.destroy()
              notification.error({
                description: 'Headers are not in the key: value format',
                message: 'Error while executing the action',
                placement: 'bottomLeft',
              })
              break
            }

            const requestHeaders = {
              ...headersObject,
              Accept: 'application/json',
              Authorization: `Bearer ${getAccessToken()}`,
            }

            const shouldSendPayload = ['POST', 'PUT', 'PATCH'].includes(verb)

            const res = await fetch(updatedUrl, {
              body: shouldSendPayload ? JSON.stringify(payload) : undefined,
              headers: requestHeaders,
              method: verb,
            })

            // eslint-disable-next-line require-atomic-updates
            jsonResponse = (await res.json()) as RestApiResponse

            setIsActionLoading(false)

            if (!res.ok) {
              let description = jsonResponse.message

              // eslint-disable-next-line max-depth
              if (errorMessage) {
                description = errorMessage.startsWith('${')
                  ? await resolveJq(errorMessage, {
                    json: payload,
                    response: jsonResponse,
                  })
                  : errorMessage
              }

              message.destroy()
              notification.error({
                description,
                message: `${jsonResponse.status} - ${jsonResponse.reason}`,
                placement: 'bottomLeft',
              })
              break
            }

            if (jsonResponse.metadata?.uid) {
              resourceUid = jsonResponse.metadata.uid
            }

            if (!onEventNavigateTo) {
              closeDrawer()

              const actionName = (() => {
                switch (verb) {
                  case 'DELETE':
                    return 'deleted'
                  case 'POST':
                    return 'created'
                  case 'PUT':
                    return 'updated'
                  case 'PATCH':
                    return 'updated'
                  default:
                    return 'updated'
                }
              })()

              let description = `Successfully ${actionName} ${jsonResponse.metadata?.name} in ${jsonResponse.metadata?.namespace}`
              // eslint-disable-next-line max-depth
              if (successMessage) {
                description = successMessage.startsWith('${')
                  ? await resolveJq(successMessage, { json: payload, response: jsonResponse })
                  : successMessage
              }

              notification.success({
                description,
                message: jsonResponse.message,
                placement: 'bottomLeft',
              })
            }

            await queryClient.invalidateQueries()

            if (onSuccessNavigateTo) {
              closeDrawer()

              const onSuccessUrl = onSuccessNavigateTo.startsWith('${')
                ? await resolveJq(onSuccessNavigateTo, { json: payload, response: jsonResponse })
                : onSuccessNavigateTo

              window.location.replace(onSuccessUrl)
            }
          }

          break
        }
        default:
          break
      }
    } catch (error) {
      message.destroy()
      notification.error({
        description: `Unhandled error: ${JSON.stringify(error)}`,
        message: 'Error while executing the action',
        placement: 'bottomLeft',
      })
    } finally {
      setIsActionLoading(false)
    }
  }

  return { handleAction, isActionLoading }
}
