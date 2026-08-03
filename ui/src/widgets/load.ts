import { registerWidget } from './registry'
import type { WidgetModule } from './widget-module'

/**
 * Widget bootstrap: eager-globs every `src/widgets/<Kind>/index.ts` and
 * registers its default-exported `WidgetModule`. Importing this module for its
 * side effect (in `App.tsx`) populates the registry before the first render.
 *
 * The eager glob MUST live here, not in `registry.ts`: container widgets import
 * `WidgetRenderer`, which imports `registry.ts`. Keeping the glob out of that
 * leaf module avoids a circular import (Vite hoists the eager glob to module
 * top, so it cannot sit anywhere inside the render cycle).
 *
 * `Drawer`/`Modal` also have an `index.ts`, but their default export is the
 * component (no `.kind`), so the guard below skips them.
 */
const modules = import.meta.glob<WidgetModule>('./*/index.ts', { eager: true, import: 'default' })

Object.values(modules)
  .filter((module): module is WidgetModule => !!module && typeof module.kind === 'string')
  .forEach(registerWidget)
