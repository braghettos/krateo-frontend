import { Result, Skeleton } from 'antd'
import { useEffect, type ReactNode } from 'react'

import useCatchError from '../../hooks/useCatchError'
import { useWidgetQuery } from '../../hooks/useWidgetQuery'
import type { Widget } from '../../types/Widget'
import BarChart from '../../widgets/BarChart'
import type { BarChartWidgetData } from '../../widgets/BarChart/BarChart'
import BlueprintBuilder from '../../widgets/BlueprintBuilder'
import type { BlueprintBuilderWidgetData } from '../../widgets/BlueprintBuilder/BlueprintBuilder'
import Button from '../../widgets/Button'
import type { ButtonWidgetData } from '../../widgets/Button/Button'
import ButtonGroup from '../../widgets/ButtonGroup'
import type { ButtonGroupWidgetData } from '../../widgets/ButtonGroup/ButtonGroup'
import Column from '../../widgets/Column'
import type { ColumnWidgetData } from '../../widgets/Column/Column'
import type { DataGridWidgetData } from '../../widgets/DataGrid/DataGrid'
import DataGrid from '../../widgets/DataGrid/DataGrid'
import EventList from '../../widgets/EventList'
import type { EventListWidgetData } from '../../widgets/EventList/EventList'
import Filters from '../../widgets/Filters'
import type { FiltersWidgetData } from '../../widgets/Filters/Filters'
import type { FlowChartWidgetData } from '../../widgets/FlowChart/FlowChart'
import FlowChart from '../../widgets/FlowChart/FlowChart'
import Form, { type FormWidgetData } from '../../widgets/Form/Form'
import LineChart from '../../widgets/LineChart'
import type { LineChartWidgetData } from '../../widgets/LineChart/LineChart'
import Markdown from '../../widgets/Markdown'
import type { MarkdownWidgetData } from '../../widgets/Markdown/Markdown'
import type { NavMenuWidgetData } from '../../widgets/NavMenu/NavMenu'
import { NavMenu } from '../../widgets/NavMenu/NavMenu'
import { Page, type PageWidgetData } from '../../widgets/Page/Page'
import type { PanelWidgetData } from '../../widgets/Panel/Panel'
import Panel from '../../widgets/Panel/Panel'
import Paragraph from '../../widgets/Paragraph'
import type { ParagraphWidgetData } from '../../widgets/Paragraph/Paragraph'
import type { PieChartWidgetData } from '../../widgets/PieChart/PieChart'
import PieChart from '../../widgets/PieChart/PieChart'
import type { RouteWidgetData } from '../../widgets/Route/Route'
import { Route } from '../../widgets/Route/Route'
import type { RoutesLoaderWidgetData } from '../../widgets/RoutesLoader/RoutesLoader'
import { RoutesLoader } from '../../widgets/RoutesLoader/RoutesLoader'
import Row from '../../widgets/Row'
import type { RowWidgetData } from '../../widgets/Row/Row'
import type { TableWidgetData } from '../../widgets/Table/Table'
import Table from '../../widgets/Table/Table'
import TabList from '../../widgets/TabList'
import type { TabListWidgetData } from '../../widgets/TabList/TabList'
import YamlViewer from '../../widgets/YamlViewer'
import type { YamlViewerWidgetData } from '../../widgets/YamlViewer/YamlViewer'
// import { ButtonPagination } from '../Pagination/ButtonPagination'
import { useFilter } from '../FiltesProvider/FiltersProvider'
import { ScrollPagination } from '../Pagination/ScrollPagination'

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

  switch (kind) {
    case 'BarChart':
      return <BarChart {...props} widgetData={widgetData as BarChartWidgetData} />
    case 'BlueprintBuilder':
      return <BlueprintBuilder {...props} widgetData={widgetData as BlueprintBuilderWidgetData} />
    case 'Button':
      return <Button {...props} widget={widget} widgetData={widgetData as ButtonWidgetData} />
    case 'Column':
      return <Column {...props} widgetData={widgetData as ColumnWidgetData} />
    case 'DataGrid':
      return (
        // <ButtonPagination
        //   fetchNextPage={fetchNextPage}
        //   hasNextPage={hasNextPage}
        //   isFetching={isFetching}
        //   isFetchingNextPage={isFetchingNextPage}
        //   isFetchingResourcesRefs={isFetchingResourcesRefs}
        // >
        //   <DataGrid {...props} widgetData={widgetData as DataGridWidgetData} />
        // </ButtonPagination>
        <ScrollPagination
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          isFetchingResourcesRefs={isFetchingResourcesRefs}
        >
          <DataGrid {...props} widgetData={widgetData as DataGridWidgetData} />
        </ScrollPagination>
      )
    case 'EventList':
      return <EventList {...props} widgetData={widgetData as EventListWidgetData} />
    case 'Filters':
      return <Filters {...props} widgetData={widgetData as FiltersWidgetData} />
    case 'FlowChart':
      return <FlowChart {...props} widgetData={widgetData as FlowChartWidgetData} />
    case 'Form':
      return <Form {...props} widgetData={widgetData as FormWidgetData} />
    case 'ButtonGroup':
      return <ButtonGroup {...props} widgetData={widgetData as ButtonGroupWidgetData} />
    case 'LineChart':
      return <LineChart {...props} widgetData={widgetData as LineChartWidgetData} />
    case 'Markdown':
      return <Markdown {...props} widgetData={widgetData as MarkdownWidgetData} />
    case 'NavMenu':
      return <NavMenu {...props} widgetData={widgetData as NavMenuWidgetData} />
    case 'Page':
      return <Page {...props} widgetData={widgetData as PageWidgetData} />
    case 'Panel':
      return <Panel {...props} widget={widget} widgetData={widgetData as PanelWidgetData} />
    case 'Paragraph':
      return <Paragraph {...props} widgetData={widgetData as ParagraphWidgetData} />
    case 'PieChart':
      return <PieChart {...props} widgetData={widgetData as PieChartWidgetData} />
    case 'Route':
      return <Route {...props} widgetData={widgetData as RouteWidgetData} />
    case 'RoutesLoader':
      return <RoutesLoader {...props} widgetData={widgetData as RoutesLoaderWidgetData} />
    case 'Row':
      return <Row {...props} widgetData={widgetData as RowWidgetData} />
    case 'Table':
      return <Table {...props} widgetData={widgetData as TableWidgetData} />
    case 'TabList':
      return <TabList {...props} widgetData={widgetData as TabListWidgetData} />
    case 'YamlViewer':
      return <YamlViewer {...props} widgetData={widgetData as YamlViewerWidgetData} />
    default:
      throw new Error(`Unknown widget kind: ${kind}`)
  }
}

const WidgetRendererError = ({ children, subtitle }: { children?: ReactNode; subtitle: string }) => {
  return (
    <div className={styles.message}>
      <Result status='error' subTitle={subtitle} title={'Error while rendering widget'}>
        {children}
      </Result>
    </div>
  )
}

const WidgetRenderer = ({ invisible = false, onLoadingChange, prefix, widgetEndpoint, wrapper }: WidgetRendererProps) => {
  const { isWidgetFilteredByProps } = useFilter()
  const { catchError } = useCatchError()

  if (!widgetEndpoint?.includes('widgets.templates.krateo.io')) {
    console.warn(`WidgetRenderer received widgetEndpoint=${widgetEndpoint}, which is probably invalid. An url is expected.`)
  }

  const { isFetchingResourcesRefs, queryResult } = useWidgetQuery(widgetEndpoint)
  const { data: widget, error, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage, isLoading } = queryResult

  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(isLoading)
    }
  }, [isLoading, onLoadingChange])

  if (isLoading) {
    return (
      <div className={styles.loading} data-widget-renderer>
        <Skeleton active />
      </div>
    )
  }

  if (error) {
    console.error(error)
    return <WidgetRendererError subtitle={`There has been an error while fetching the widget: ${error}`} />
  }

  if (!widget) {
    return invisible ? null : <WidgetRendererError subtitle={'The widget does not exist'} />
  }

  const { code, kind, message, status } = widget

  if (!status) {
    return <WidgetRendererError subtitle={`Widget ${kind} does not have a status specification`} />
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
        <WidgetRendererError subtitle={`There has been an error while rendering a widget with the following specification:`}>
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
        </WidgetRendererError>
      )
    }

    return <WidgetRendererError subtitle={`Status for ${kind} widget is in string format: ${status}`} />
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
