import { useEffect } from 'react'

import { useConfigContext } from '../context/ConfigContext'

import { type InvolvedObject, liveRefreshRegistry, type WatchMatcher } from './liveRefresh'
import { subscribeSse } from './sseClient'

/**
 * Mount ONCE near the app root: pipe the SSE event firehose into the live-refresh
 * registry, which fans each event out to the widgets that declared a matching
 * `watch`. Subscribes through the shared sseClient, so it reuses the connection
 * Notifications already holds (no extra socket).
 */
export const useLiveRefreshFirehose = (): void => {
  const { config } = useConfigContext()

  useEffect(() => {
    const base = config?.api.EVENTS_PUSH_API_BASE_URL
    if (!base) { return undefined }

    return subscribeSse(`${base}/notifications`, 'krateo', {
      onMessage: (raw) => {
        try {
          const event = JSON.parse(raw) as { involvedObject?: InvolvedObject }
          if (event.involvedObject) { liveRefreshRegistry.handleEvent(event.involvedObject) }
        } catch { /* ignore malformed SSE payloads */ }
      },
    })
  }, [config])
}

/**
 * A widget declares the involvedObject(s) it is tied to (`widgetData.watch`) and
 * refetches when a matching k8s event arrives (throttled per widget by the
 * registry). Re-registers only when the watch content or refetch fn changes.
 */
export const useLiveWatch = (watch: WatchMatcher[] | undefined, refetch: () => unknown): void => {
  const key = watch && watch.length > 0 ? JSON.stringify(watch) : ''

  useEffect(() => {
    if (!key) { return undefined }

    return liveRefreshRegistry.register(JSON.parse(key) as WatchMatcher[], refetch)
  }, [key, refetch])
}
