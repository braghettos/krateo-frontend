import type { ResourcesRefs } from '../types/Widget'

export const getResourceRef = (resourceRefId: string, resourcesRefs: ResourcesRefs) => {
  if (!resourcesRefs || resourcesRefs.items.length === 0) {
    console.error(`Cannot find resources refs for resource ref with ID ${resourceRefId}`)
    return
  }

  const backendEndpoint = resourcesRefs.items.find(({ id }) => {
    return id === resourceRefId
  })

  if (!backendEndpoint) {
    console.error(`Cannot find resource ref with ID ${resourceRefId}`)
  }

  return backendEndpoint
}

export const getEndpointUrl = (resourceRefId: string, resourcesRefs: ResourcesRefs) => {
  const backendEndpoint = getResourceRef(resourceRefId, resourcesRefs)

  return backendEndpoint?.path
}

export const getResourceEndpoint = ({
  apiVersion,
  name,
  namespace,
  resource,
}: {
  resource: string
  apiVersion: string
  name: string
  namespace: string
}): string => {
  return `/call?resource=${resource}&apiVersion=${apiVersion}&name=${name}&namespace=${namespace}`
}

export const formatISODate = (value: string, showTime: boolean = false) => {
  return showTime
    ? new Date(value).toLocaleDateString('en', {
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    : new Date(value).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Compact relative time ("now", "12s", "5m", "3h", "2d", "2w") — flight-deck
 * telemetry style, no " ago" suffix, with a weeks tier; falls back to the absolute
 * date beyond ~8 weeks. Used by feed/list rows + table cells (e.g. EventList). */
export const formatRelativeTime = (value: string): string => {
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) { return value }
  const seconds = Math.round((Date.now() - then) / 1000)
  if (seconds < 10) { return 'now' }
  if (seconds < 60) { return `${seconds}s` }
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) { return `${minutes}m` }
  const hours = Math.round(minutes / 60)
  if (hours < 24) { return `${hours}h` }
  const days = Math.round(hours / 24)
  if (days < 7) { return `${days}d` }
  const weeks = Math.round(days / 7)
  if (days < 60) { return `${weeks}w` }
  return formatISODate(value)
}

export const getHeadersObject = (headers: string[]): Record<string, string> | undefined => {
  const result: Record<string, string> = {}

  for (const header of headers) {
    const parts = header.split(':')
    if (parts.length !== 2) {
      return undefined
    }

    const key = parts[0].trim()
    const value = parts[1].trim()

    if (!key || !value) {
      return undefined
    }

    result[key] = value
  }

  return result
}

export const parseNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (trimmed === '') {
    return null
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}
