import { Fragment } from 'react'

import AppShellLayout from '../../components/AppShell'
import WidgetRenderer from '../../components/WidgetRenderer'
import type { ResourcesRefs, WidgetProps } from '../../types/Widget'
import { getEndpointUrl } from '../../utils/utils'

import type { AppShell as WidgetType } from './AppShell.type'

export type AppShellWidgetData = WidgetType['spec']['widgetData']

const slot = (resourceRefId: string | undefined, resourcesRefs: ResourcesRefs) => {
  if (!resourceRefId) { return null }
  const endpoint = getEndpointUrl(resourceRefId, resourcesRefs)
  return endpoint ? <WidgetRenderer widgetEndpoint={endpoint} /> : null
}

const slots = (ids: string[] | undefined, resourcesRefs: ResourcesRefs) =>
  (ids ?? []).map((id, index) => <Fragment key={`${id}-${index}`}>{slot(id, resourcesRefs)}</Fragment>)

/**
 * Server-driven portal shell: resolves each slot (sidebar / headerLeft /
 * headerRight / content) to a child widget endpoint and renders them through
 * the shared AppShell layout. The app's top-level routed shell uses the layout
 * component directly (WidgetPage) so routing/bootstrap stay client-owned; this
 * widget is for fully CR-defined shells.
 */
const AppShell = ({ resourcesRefs, widgetData }: WidgetProps<AppShellWidgetData>) => {
  const { content, headerLeft, headerRight, logoSrc, sidebar } = widgetData

  return (
    <AppShellLayout
      content={slot(content, resourcesRefs)}
      headerLeft={slots(headerLeft, resourcesRefs)}
      headerRight={slots(headerRight, resourcesRefs)}
      logoSrc={logoSrc}
      sidebar={slot(sidebar, resourcesRefs)}
    />
  )
}

export default AppShell
