import { useEffect } from 'react'

/** App default browser-tab title (mirrors index.html <title>). */
export const DEFAULT_DOCUMENT_TITLE = 'Krateo'

/**
 * Single, route-driven owner of the browser-tab title. Sets `document.title`
 * to `title` (falling back to the app default) whenever it changes.
 *
 * This is the relocation of title-setting OFF the `Page` widget (which used to
 * render a `<title>` element from its `widgetData.title`) and onto the routing
 * layer, so the tab title is owned by the route shell and survives `Page`'s
 * eventual elimination. Driven from `WidgetPage` via the matched route's title.
 */
export const useDocumentTitle = (title?: string) => {
  useEffect(() => {
    document.title = title?.trim() ? title : DEFAULT_DOCUMENT_TITLE
  }, [title])
}
