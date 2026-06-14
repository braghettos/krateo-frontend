import { useEffect, useState } from 'react'

import { useConfigContext } from '../context/ConfigContext'

/**
 * Generic Server-Sent-Events stream: subscribes to `topic` at `endpoint`
 * (resolved under `EVENTS_PUSH_API_BASE_URL`) and prepends each parsed message
 * to a capped buffer. Decoupled from any item shape — the data source concern,
 * separate from presentation (ListView) and domain mapping (itemTemplate).
 */
export const useSseStream = <T, >({ endpoint, initial, max = 200, topic }: {
  endpoint?: string
  topic?: string
  initial: T[]
  max?: number
}): { connecting: boolean; items: T[] } => {
  const { config } = useConfigContext()
  const [items, setItems] = useState<T[]>(initial)
  const [connecting, setConnecting] = useState<boolean>(!!endpoint && !!topic)

  useEffect(() => {
    if (!endpoint || !topic) {
      setConnecting(false)
      return
    }

    const url = `${config!.api.EVENTS_PUSH_API_BASE_URL}${endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint}`
    const timeout = setTimeout(() => setConnecting(false), 10000)
    let source: EventSource | undefined

    try {
      source = new EventSource(url, { withCredentials: false })
      source.addEventListener(topic, (event: MessageEvent<string>) => {
        try {
          const data = JSON.parse(event.data) as T
          setItems((prev) => [data, ...prev].slice(0, max))
          setConnecting(false)
        } catch (error) {
          console.error('Error parsing SSE data:', error)
        }
      })
      source.onerror = () => {
        setConnecting(false)
        source?.close()
      }
    } catch (error) {
      console.warn('Error initializing SSE connection:', error)
      setConnecting(false)
    }

    return () => {
      source?.close()
      clearTimeout(timeout)
    }
  }, [config, endpoint, topic, max])

  return { connecting, items }
}
