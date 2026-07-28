import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

import { useGetEvents } from '../../hooks/useGetEvents'
import type { SSEK8sEvent } from '../../utils/types'

/**
 * Shared state for the header notification bell + its drawer. Provided at the stable
 * `ShellRoute` level (which mounts once) so the open-state and the SSE subscription
 * SURVIVE the header chrome remounting — the header is projected as a slot INTO the
 * server-driven Layout widget (see Shell/Layout), which remounts its subtree on every
 * data refresh. Holding `open` in a component-local `useState` inside the bell would
 * reset to false on each such remount, snapping the drawer shut ~1-2s after opening on
 * busy clusters. Keeping it here (above the churn boundary) decouples the two.
 */
interface NotificationsCtx {
  isLoading: boolean
  notifications: SSEK8sEvent[] | undefined
  open: boolean
  setOpen: (open: boolean) => void
}

const Ctx = createContext<NotificationsCtx | null>(null)

export const NotificationsProvider = ({ children, topic = 'krateo' }: { children: ReactNode; topic?: string }) => {
  const [open, setOpen] = useState(false)
  // Single initial-GET + SSE subscription for the whole app, anchored here so it does not
  // tear down / reconnect every time the header chrome remounts.
  const { data: notifications, isLoading } = useGetEvents({ registerToSSE: true, topic })

  const value = useMemo<NotificationsCtx>(
    () => ({ isLoading, notifications, open, setOpen }),
    [isLoading, notifications, open]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useNotifications = (): NotificationsCtx => {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationsProvider')
  }
  return ctx
}
