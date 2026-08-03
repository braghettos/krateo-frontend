import { useIsFetching } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

interface UseProgressiveLoadingOptions {
  totalItems: number
  initialBatchSize?: number
  batchIncrement?: number
  maxConcurrentRequests?: number
  checkInterval?: number
}

export const useProgressiveLoading = ({
  batchIncrement = 10,
  checkInterval = 500,
  initialBatchSize = 10,
  maxConcurrentRequests = 5,
  totalItems,
}: UseProgressiveLoadingOptions) => {
  const isFetching = useIsFetching({ queryKey: ['widgets'] })
  const [visibleCount, setVisibleCount] = useState(initialBatchSize)

  useEffect(() => {
    const checkAndLoadMore = () => {
      // If we have capacity and more items to load, increase visible count
      if (isFetching < maxConcurrentRequests && visibleCount < totalItems) {
        setVisibleCount((prev) => Math.min(prev + batchIncrement, totalItems))
      }
    }

    // Check periodically
    const interval = setInterval(checkAndLoadMore, checkInterval)

    return () => clearInterval(interval)
  }, [isFetching, visibleCount, totalItems, batchIncrement, maxConcurrentRequests, checkInterval])

  return visibleCount
}
