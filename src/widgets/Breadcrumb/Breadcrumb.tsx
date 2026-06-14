import { Breadcrumb as AntdBreadcrumb } from 'antd'

import type { WidgetProps } from '../../types/Widget'

import type { Breadcrumb as WidgetType } from './Breadcrumb.type'

export type BreadcrumbWidgetData = WidgetType['spec']['widgetData']

/**
 * Faithful wrapper of antd `Breadcrumb`: an ordered list of crumbs (`items`,
 * each an optional link) and an optional `separator`. The items are supplied by
 * the CR; a client caller (e.g. a routed shell) can compute them from the router
 * and render this same widget.
 */
const Breadcrumb = ({ widgetData }: WidgetProps<BreadcrumbWidgetData>) => {
  const { items, separator } = widgetData

  return <AntdBreadcrumb items={items} separator={separator} />
}

export default Breadcrumb
