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
}

/** Resolve any registered module — antd widgets AND structural kinds (used by WidgetRenderer). */
export const getWidgetModule = (kind: string): WidgetModule | undefined => registry.get(kind)

/** The antd-mapped widget set — excludes structural navigation/routing kinds. */
export const getWidgetRegistry = (): Record<string, WidgetModule> =>
  Object.fromEntries([...registry].filter(([, module]) => !module.structural))

/** The structural navigation kinds (Page) — not antd widgets. */
export const getStructuralRegistry = (): Record<string, WidgetModule> =>
  Object.fromEntries([...registry].filter(([, module]) => module.structural))
