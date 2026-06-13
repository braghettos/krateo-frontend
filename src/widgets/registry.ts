import type { WidgetModule } from './widget-module'

/**
 * Leaf registry: a plain `kind → WidgetModule` map plus accessors. This module
 * imports NOTHING heavy, so `WidgetRenderer` can depend on it without a cycle.
 *
 * Population happens in `./load` (the eager glob lives there, outside the
 * render cycle). `./load` is imported once at app bootstrap (`App.tsx`).
 */
const registry = new Map<string, WidgetModule>()

export const registerWidget = (module: WidgetModule): void => {
  registry.set(module.kind, module)
  // Back-compat: legacy kind names (pre antd-naming alignment) resolve to the
  // same component, so existing Widget CRs keep rendering after a rename.
  module.aliases?.forEach((alias) => registry.set(alias, module))
}

export const getWidgetModule = (kind: string): WidgetModule | undefined => registry.get(kind)

export const getWidgetRegistry = (): Record<string, WidgetModule> => Object.fromEntries(registry)
