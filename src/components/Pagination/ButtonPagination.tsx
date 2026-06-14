import { Button } from 'antd'

export const ButtonPagination = ({
  children,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isFetchingResourcesRefs,
}: {
  fetchNextPage: () => Promise<unknown> | void
  hasNextPage: boolean
  children: React.ReactNode
  isFetchingNextPage: boolean
  isFetchingResourcesRefs: boolean
}) => {
  return (
    <>
      {children}

      <div>
        {hasNextPage && (
          <Button disabled={isFetchingNextPage || isFetchingResourcesRefs} onClick={() => { void fetchNextPage() }}>
            Load more
          </Button>
        )}
      </div>
    </>
  )
}
