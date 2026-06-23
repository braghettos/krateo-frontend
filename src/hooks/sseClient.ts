/**
 * Shared, ref-counted Server-Sent-Events client.
 *
 * Every subscriber to the same `url` shares ONE `EventSource` instead of each
 * opening its own connection (the portal otherwise holds a socket per List /
 * Notifications / in-flight action, all pointed at the same `/notifications`
 * endpoint). The connection opens on the first subscriber and closes when the
 * last one leaves; messages are routed to subscribers by SSE event `topic`, and
 * connection open/error are fanned out to every subscriber on that connection.
 *
 * This is the data-transport seam — decoupled from React. Hooks wrap it
 * (useSseStream, useGetEvents); unmount → call the returned unsubscribe.
 */
export interface SseSubscriber {
  /** Called with the raw `event.data` string for each message on the subscribed topic. */
  onMessage: (data: string) => void
  /** Connection opened. */
  onOpen?: () => void
  /** Connection errored (the shared connection is then torn down; a later subscribe reopens). */
  onError?: () => void
}

interface SseConnection {
  source: EventSource
  /** topic → subscribers listening on that topic (for message routing). */
  byTopic: Map<string, Set<SseSubscriber>>
  /** all subscribers on this connection (for open/error fan-out + ref counting). */
  all: Set<SseSubscriber>
}

const connections = new Map<string, SseConnection>()

const teardown = (url: string, connection: SseConnection) => {
  connection.source.close()
  if (connections.get(url) === connection) {
    connections.delete(url)
  }
}

/**
 * Subscribe to `topic` on the SSE stream at `url`. Returns an idempotent
 * unsubscribe; when the last subscriber for a `url` unsubscribes, its connection
 * is closed.
 */
export const subscribeSse = (url: string, topic: string, subscriber: SseSubscriber): () => void => {
  let connection = connections.get(url)

  if (!connection) {
    const conn: SseConnection = { all: new Set(), byTopic: new Map(), source: new EventSource(url, { withCredentials: false }) }
    conn.source.onopen = () => { conn.all.forEach((sub) => sub.onOpen?.()) }
    conn.source.onerror = () => {
      conn.all.forEach((sub) => sub.onError?.())
      teardown(url, conn)
    }
    connections.set(url, conn)
    connection = conn
  }

  const conn = connection

  let topicSubscribers = conn.byTopic.get(topic)
  if (!topicSubscribers) {
    topicSubscribers = new Set()
    conn.byTopic.set(topic, topicSubscribers)
    // One EventSource listener per topic, fanning out to that topic's subscribers.
    conn.source.addEventListener(topic, (event: MessageEvent<string>) => {
      conn.byTopic.get(topic)?.forEach((sub) => { sub.onMessage(event.data) })
    })
  }

  topicSubscribers.add(subscriber)
  conn.all.add(subscriber)

  let active = true
  return () => {
    if (!active) { return }
    active = false
    conn.byTopic.get(topic)?.delete(subscriber)
    conn.all.delete(subscriber)
    if (conn.all.size === 0) {
      teardown(url, conn)
    }
  }
}

/** Test-only: close + drop all connections. */
export const __resetSseConnections = (): void => {
  connections.forEach((connection) => connection.source.close())
  connections.clear()
}
