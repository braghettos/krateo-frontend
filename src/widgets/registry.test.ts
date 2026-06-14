import yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'

import './load'

import { getWidgetRegistry } from './registry'

const widgetRegistry = getWidgetRegistry()

/** Raw contents of every example fixture, loaded through Vite's glob import. */
const exampleFiles = import.meta.glob<string>('../examples/widgets/**/*.example.yaml', {
  eager: true,
  import: 'default',
  query: '?raw',
})

// Fixtures also contain non-widget CRs (e.g. RESTAction on templates.krateo.io)
// referenced by Form/Button examples — only collect actual widget CRs.
const exampleKinds = new Set<string>()
for (const raw of Object.values(exampleFiles)) {
  const docs = yaml.loadAll(raw) as Array<{ kind?: unknown; apiVersion?: unknown } | null>
  for (const doc of docs) {
    if (doc && typeof doc.kind === 'string' && typeof doc.apiVersion === 'string'
      && doc.apiVersion.includes('widgets.templates.krateo.io')) {
      exampleKinds.add(doc.kind)
    }
  }
}

/** The kinds that had a hand-written `case` in the old parseWidget switch. */
const KNOWN_KINDS = [
  'BarChart', 'BlueprintBuilder', 'Button', 'ButtonGroup', 'Column', 'DataGrid',
  'EventList', 'Filters', 'FlowChart', 'Form', 'LineChart', 'Markdown', 'NavMenu',
  'Page', 'Panel', 'Paragraph', 'PieChart', 'Route', 'RoutesLoader', 'Row',
  'Table', 'TabList', 'YamlViewer',
]

describe('widgetRegistry', () => {
  it('registers all 23 known kinds (regression gate for the switch removal)', () => {
    for (const kind of KNOWN_KINDS) {
      expect(widgetRegistry[kind], `kind "${kind}" should be registered`).toBeDefined()
      // A component may be a function OR a React exotic object (lazy/memo/forwardRef);
      // the chart widgets use React.lazy() for code-splitting, so accept both.
      expect(['function', 'object']).toContain(typeof widgetRegistry[kind].component)
    }
  })

  it('registers a module for every kind used in example fixtures', () => {
    expect(exampleKinds.size).toBeGreaterThan(0)
    for (const kind of exampleKinds) {
      expect(widgetRegistry[kind], `example kind "${kind}" should be registered`).toBeDefined()
    }
  })

  it('registers antd-named kinds with legacy names as back-compat aliases', () => {
    const renames: Array<[antd: string, legacy: string]> = [
      ['Card', 'Panel'],
      ['Col', 'Column'],
      ['Tabs', 'TabList'],
      ['Menu', 'NavMenu'],
    ]
    for (const [antd, legacy] of renames) {
      expect(widgetRegistry[antd], `antd kind "${antd}" should be registered`).toBeDefined()
      expect(widgetRegistry[legacy], `legacy alias "${legacy}" should still resolve`).toBeDefined()
      // alias and primary resolve to the very same module
      expect(widgetRegistry[legacy]).toBe(widgetRegistry[antd])
    }
  })

  it('marks List as paginated and resolves DataGrid as a back-compat alias of List', () => {
    expect(widgetRegistry.List?.paginated).toBe(true)
    // DataGrid folded into List: the legacy kind resolves to the very same module
    expect(widgetRegistry.DataGrid).toBe(widgetRegistry.List)
  })

  it('excludes Drawer and Modal (mounted directly by WidgetPage, not via the registry)', () => {
    expect(widgetRegistry.Drawer).toBeUndefined()
    expect(widgetRegistry.Modal).toBeUndefined()
  })
})
