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
  <div className={styles.message}>
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
