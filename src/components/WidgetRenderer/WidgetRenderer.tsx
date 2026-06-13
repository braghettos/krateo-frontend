import { useEffect } from 'react'

import useCatchError from '../../hooks/useCatchError'
import { useWidgetQuery } from '../../hooks/useWidgetQuery'
import type { Widget } from '../../types/Widget'
import { getWidgetModule } from '../../widgets/registry'
import { useFilter } from '../FiltesProvider/FiltersProvider'
import { ScrollPagination } from '../Pagination/ScrollPagination'
import { WidgetError, WidgetLoading } from '../WidgetStates'

import styles from './WidgetRenderer.module.css'

type WidgetRendererProps = {
  invisible?: boolean
  onLoadingChange?: (isLoading: boolean) => void
  prefix?: string
  widgetEndpoint: string
  wrapper?: {
    component: React.ComponentType<{ children: React.ReactNode }>
    props?: Record<string, unknown>
  }
}

const parseWidget = (
  widget: Widget,
  fetchNextPage: () => Promise<unknown> | void,
  hasNextPage: boolean,
  isFetching: boolean,
  isFetchingNextPage: boolean,
  isFetchingResourcesRefs: boolean
) => {
  if (typeof widget.status === 'string') {
    return null
  }

  const {
    kind,
    metadata,
    status: { resourcesRefs, widgetData },
  } = widget

  const props = {
    resourcesRefs: { ...resourcesRefs, items: resourcesRefs?.items?.filter(({ allowed }) => allowed) ?? [] },
    uid: metadata.uid,
  }

  const module = getWidgetModule(kind)

  if (!module) {
    throw new Error(`Unknown widget kind: ${kind}`)
  }

  const Component = module.component
  const element = <Component {...props} widget={widget} widgetData={widgetData} />

  if (module.paginated) {
    return (
      <ScrollPagination
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetching={isFetching}
        isFetchingNextPage={isFetchingNextPage}
        isFetchingResourcesRefs={isFetchingResourcesRefs}
      >
        {element}
      </ScrollPagination>
    )
  }

  return element
}

const WidgetRenderer = ({ invisible = false, onLoadingChange, prefix, widgetEndpoint, wrapper }: WidgetRendererProps) => {
  const { isWidgetFilteredByProps } = useFilter()
  const { catchError } = useCatchError()

  if (!widgetEndpoint?.includes('widgets.templates.krateo.io')) {
    console.warn(`WidgetRenderer received widgetEndpoint=${widgetEndpoint}, which is probably invalid. An url is expected.`)
  }

  const { isFetchingResourcesRefs, queryResult } = useWidgetQuery(widgetEndpoint)
  const { data: widget, error, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, isLoading, isPending, refetch } = queryResult

  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(isLoading)
    }
  }, [isLoading, onLoadingChange])

  // `isPending` (not `isLoading`) keeps the loading state visible across retry
  // backoff gaps, so a not-yet-ready backend shows a skeleton — not the error
  // "red cross" — until retries are exhausted (see useWidgetQuery retry config).
  if (isPending) {
    return <WidgetLoading />
  }

  if (error) {
    console.error(error)
    const failedToFetch = error instanceof Error && (error instanceof TypeError || error.message.includes('Failed to fetch'))
    const subtitle = failedToFetch
      ? "Couldn't reach the server. It may still be starting up."
      : `There has been an error while fetching the widget: ${error instanceof Error ? error.message : 'unknown error'}`
    return <WidgetError onRetry={() => { void refetch() }} subtitle={subtitle} />
  }

  if (!widget) {
    return invisible ? null : <WidgetError subtitle={'The widget does not exist'} />
  }

  const { code, kind, message, status } = widget

  if (!status) {
    return <WidgetError subtitle={`Widget ${kind} does not have a status specification`} />
  }

  if (typeof status === 'string') {
    if (kind === 'Status') {
      if (code === 401) {
        catchError(
          {
            data: { message },
            message: `Authentication error (code: ${code})`,
            status: code,
          },
          'notification'
        )
      }

      if (code === 500 && status === 'Failure' && message?.includes('credentials')) {
        catchError(
          {
            data: { message },
            message: `Credentials error (code: ${code})`,
            status: code,
          },
          'notification'
        )

        window.location.replace('/login')
      }

      const params = new URLSearchParams(widgetEndpoint)

      return (
        <WidgetError subtitle={`There has been an error while rendering a widget with the following specification:`}>
          <div className={styles.content}>
            <pre className={styles.pre}>
              <b>Name:</b> {params.get('name')}
              {'\n'}
              <b>Namespace:</b> {params.get('namespace')}
              {'\n'}
              <b>Version:</b> {params.get('apiVersion')}
              {'\n'}
              <b>Endpoint:</b> {widgetEndpoint}
              {'\n'}
              {'\n'}
              <b>Widget:</b> {JSON.stringify(widget, null, 2)}
              {'\n'}
            </pre>
          </div>
        </WidgetError>
      )
    }

    return <WidgetError subtitle={`Status for ${kind} widget is in string format: ${status}`} />
  }

  if (prefix && isWidgetFilteredByProps(status.widgetData, prefix)) {
    return null
  }

  const renderedWidget = parseWidget(widget, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, isFetchingResourcesRefs)

  if (wrapper) {
    return <wrapper.component {...wrapper.props}>{renderedWidget}</wrapper.component>
  }

  return renderedWidget
}

export default WidgetRenderer
