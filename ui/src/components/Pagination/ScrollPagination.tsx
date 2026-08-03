import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Spin } from 'antd'
import { useEffect } from 'react'
import { useInView } from 'react-intersection-observer'

import styles from './Pagination.module.css'

export const ScrollPagination = ({
  children,
  fetchNextPage,
  hasNextPage,
  isFetching,
  isFetchingNextPage,
  isFetchingResourcesRefs,
}: {
  fetchNextPage: () => Promise<unknown> | void
  hasNextPage: boolean
  children: React.ReactNode
  isFetching: boolean
  isFetchingNextPage: boolean
  isFetchingResourcesRefs: boolean
}) => {
  const { inView, ref } = useInView()

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !isFetchingResourcesRefs) {
      void fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, inView, isFetchingNextPage, isFetchingResourcesRefs])

  return (
    <>
      {children}

      <div className={styles.loading} ref={ref}>
        {isFetching && <Spin indicator={<FontAwesomeIcon icon={['fas', 'spinner'] as IconProp} spin />} size='large' spinning />}
        {/* <div>isFetching: {isFetching.toString()}</div>
        <div>isFetchingNextPage: {isFetchingNextPage.toString()}</div>
        <div>isFetchingResourcesRefs: {isFetchingResourcesRefs.toString()}</div>
        <div>has more items: {hasNextPage?.toString()}</div> */}
      </div>
    </>
  )
}
