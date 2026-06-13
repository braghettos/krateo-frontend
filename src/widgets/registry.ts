import type { WidgetModule } from './widget-module'

/**
 * Auto-discovered widget registry. Every `src/widgets/<Kind>/index.ts` whose
 * default export is a `WidgetModule` is registered by its `kind`.
 *
 * `Drawer` and `Modal` also have an `index.ts`, but their default export is the
 * component itself (no `.kind`), so the type guard below excludes them — they
 * are mounted directly by `WidgetPage`, not rendered through the registry.
 */
const modules = import.meta.glob<WidgetModule>('./*/index.ts', { eager: true, import: 'default' })

export const widgetRegistry: Record<string, WidgetModule> = Object.fromEntries(
  Object.values(modules)
    .filter((module): module is WidgetModule => !!module && typeof module.kind === 'string')
    .map((module) => [module.kind, module])
)
