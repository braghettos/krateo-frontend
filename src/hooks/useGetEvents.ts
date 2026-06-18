import type { QueryKey } from '@tanstack/react-query'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'

import { useConfigContext } from '../context/ConfigContext'
import type { SSEK8sEvent } from '../utils/types'

import { subscribeSse } from './sseClient'

const MAX_EVENTS = 200
// 10 seconds
const CLEANUP_INTERVAL = 10000

export function useGetEvents({ registerToSSE = true, topic = 'krateo' }: { topic?: string; registerToSSE?: boolean }) {
  const { config } = useConfigContext()

  // list of events
  const eventsUrl = `${config!.api.EVENTS_API_BASE_URL}/events`

  // stream of events
  const notificationsUrl = `${config!.api.EVENTS_PUSH_API_BASE_URL}/notifications`

  const queryKey: QueryKey = useMemo(() => ['events', eventsUrl, 'topic', topic], [eventsUrl, topic])

  const queryClient = useQueryClient()
  const queryResult = useQuery({
    gcTime: Infinity,
    queryFn: async () => {
      const res = await fetch(eventsUrl)
      const notifications = (await res.json()) as SSEK8sEvent[]
      return notifications
    },
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- we want to re-fetch when the url changes
    queryKey,
    /* Prevent all automatic refetching, SSE will handle new events  */
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  })

  // Cleanup old events periodically to prevent memory issues
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.setQueryData(queryKey, (prev: SSEK8sEvent[]) => {
        if (!prev || prev.length <= MAX_EVENTS) {
          return prev
        }
        return prev.slice(0, MAX_EVENTS)
      })
    }, CLEANUP_INTERVAL)

    return () => clearInterval(interval)
  }, [queryClient, queryKey])

  useEffect(() => {
    if (!registerToSSE) {
      return
    }

    // Subscribe through the shared SSE client so we don't open a second connection to
    // /notifications when other widgets (List/EventList) listen to the same stream.
    return subscribeSse(notificationsUrl, topic, {
      onError: () => { console.error('[SSE] Connection error') },
      onMessage: (raw) => {
        try {
          const data = JSON.parse(raw) as SSEK8sEvent
          queryClient.setQueryData(queryKey, (prev: SSEK8sEvent[]) => [data, ...(prev || [])])
        } catch (error) {
          console.error('Error parsing event data:', error)
        }
      },
    })
  }, [notificationsUrl, topic, queryClient, queryKey, registerToSSE])

  return queryResult
}
