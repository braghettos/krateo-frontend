import NotificationsChrome from '../../components/Notifications'
import type { WidgetProps } from '../../types/Widget'

import type { Notifications as WidgetType } from './Notifications.type'

export type NotificationsWidgetData = WidgetType['spec']['widgetData']

/**
 * Notifications as a registry widget: the events SSE stream (Bell + Drawer,
 * rendered through the shared ListView). Registering it as a kind lets a
 * server-driven layout place it in a header slot like any other widget.
 */
const Notifications = ({ widgetData }: WidgetProps<NotificationsWidgetData>) => <NotificationsChrome topic={widgetData?.topic} />

export default Notifications
