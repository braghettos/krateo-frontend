import { Button, Empty, Result, Skeleton } from 'antd'
import type { ReactNode } from 'react'

import styles from './WidgetStates.module.css'

/** Shared loading state for a widget (skeleton). */
export const WidgetLoading = () => (
  <div className={styles.loading} data-widget-renderer>
    <Skeleton active />
  </div>
)

/** Shared empty state for list/data widgets. */
export const WidgetEmpty = ({ description }: { description?: ReactNode }) => (
  <div className={styles.empty}>
    <Empty description={description} image={Empty.PRESENTED_IMAGE_SIMPLE} />
  </div>
)

/** Shared error state for a widget. Optional `children` render extra detail; `onRetry` adds a Retry button. */
export const WidgetError = ({ children, onRetry, subtitle }: { children?: ReactNode; onRetry?: () => void; subtitle: string }) => (
  <div className={styles.message} data-testid='widget-error'>
    <Result
      extra={onRetry ? <Button onClick={onRetry} type='primary'>Retry</Button> : undefined}
      status='error'
      subTitle={subtitle}
      title='Error while rendering widget'
    >
      {children}
    </Result>
  </div>
)

/**
 * Distinct, CALM timeout state — the server is reachable but slow / still working
 * (a request deadline, a cancelled fetch, or a 503/504 gateway timeout), as opposed
 * to a hard render error (`WidgetError`, red cross). Copy is reassuring, not alarming,
 * and offers a Retry. Rendered by WidgetRenderer when `isTimeoutError` classifies the
 * failure as transient-slow rather than a genuine error.
 */
export const WidgetTimeout = ({ onRetry, subtitle }: { onRetry?: () => void; subtitle?: string }) => (
  <div className={styles.timeout} data-testid='widget-timeout'>
    <Result
      extra={onRetry ? <Button onClick={onRetry} type='primary'>Retry</Button> : undefined}
      status='info'
      subTitle={subtitle ?? 'The server is taking longer than expected. This can happen while it warms up or under load.'}
      title='Still waiting on the server'
    />
  </div>
)

/**
 * Classify a fetch failure as a TIMEOUT (calm, retryable) vs a hard error. True for
 * request deadlines, cancelled/aborted fetches, and 503/504 gateway timeouts —
 * detected from the HTTP status when present, otherwise from the message class. Pure
 * so it can be unit-tested and reused by WidgetRenderer.
 */
export const isTimeoutError = (error: unknown): boolean => {
  const status = (error as { status?: number } | null)?.status
  if (status === 503 || status === 504) { return true }

  let rawMessage = ''
  if (error instanceof Error) {
    rawMessage = error.message
  } else if (typeof error === 'string') {
    rawMessage = error
  }
  const message = rawMessage.toLowerCase()
  if (!message) { return false }

  return (
    message.includes('deadline')
    || message.includes('timeout')
    || message.includes('timed out')
    || message.includes('canceled')
    || message.includes('cancelled')
    || message.includes('aborted')
    || message.includes('503')
    || message.includes('504')
  )
}
