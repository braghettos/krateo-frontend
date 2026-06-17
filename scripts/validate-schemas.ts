/* eslint-disable no-console */
import { readFile } from 'fs/promises'
import path from 'path'

import type { AnySchema } from 'ajv'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { glob } from 'glob'

import type { JSONSchema } from '../src/utils/types'

const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)

const files = await glob('**/*.schema.json', {
  ignore: ['node_modules/**'],
})

let hasErrors = false

const ACTION_TYPE_KEYS = ['rest', 'navigate', 'openDrawer', 'openModal']

// Stable, key-sorted JSON for structural comparison (ignores property ordering).
const stable = (value: unknown): string => {
  if (value === undefined) { return 'null' }
  if (Array.isArray(value)) { return `[${value.map(stable).join(',')}]` }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

// The comparable core of an action-map schema node (title/description/$id ignored).
const actionMapCore = (node: Record<string, unknown>): string =>
  stable({ additionalProperties: node.additionalProperties, properties: node.properties, type: node.type })

// An action-map node is an object schema whose properties include action-type arrays
// (rest/navigate/openDrawer/openModal). Content-based, so it matches the map wherever
// it sits (widgetData.actions, widgetData.itemTemplate.actions) and never a same-named
// antd child slot (e.g. a Card footer `actions`, which is an array of resource refs).
const isActionMap = (node: unknown): node is Record<string, unknown> => {
  const props = (node as { properties?: unknown } | null)?.properties
  return Boolean(props && typeof props === 'object' && ACTION_TYPE_KEYS.some((key) => key in props))
}

const collectActionMaps = (node: unknown, acc: Record<string, unknown>[] = []): Record<string, unknown>[] => {
  if (!node || typeof node !== 'object') { return acc }
  if (isActionMap(node)) { acc.push(node) }
  for (const value of Object.values(node as Record<string, unknown>)) { collectActionMaps(value, acc) }
  return acc
}

// Single source of truth for the action-map shape; widgets must copy it verbatim.
const actionsFragment = JSON.parse(await readFile('src/schemas/actions.schema.json', 'utf-8')) as Record<string, unknown>
const canonicalActionMap = actionMapCore(actionsFragment)

// Validate all schemas in parallel
await Promise.all(
  files.map(async (file) => {
    try {
      const schemaText = await readFile(file, 'utf-8')
      const schema = JSON.parse(schemaText) as AnySchema

      ajv.compile(schema)

      if (file.startsWith('src/widgets/') && path.basename(file).endsWith('.schema.json')) {
        // Drift guard: every action-map a widget declares (widgetData.actions, or a
        // per-row widgetData.itemTemplate.actions) must copy the canonical fragment
        // verbatim — the single source of truth from which the WidgetActions type is
        // generated. This is what keeps the schema and the type from drifting as new
        // action-bearing widgets are added.
        for (const map of collectActionMaps((schema as JSONSchema).properties?.spec)) {
          if (actionMapCore(map) !== canonicalActionMap) {
            throw new Error(
              'widgetData.actions drifted from the canonical action map '
              + '(src/schemas/actions.schema.json). Re-sync it to the fragment verbatim.'
            )
          }
        }
      }

      console.log(`✅ ${file} is a valid JSON Schema.`)
    } catch (err) {
      console.error(`❌ Error in ${file}:`)
      console.error(err instanceof Error ? err.message : err)
      hasErrors = true
    }
  })
)

if (hasErrors) {
  process.exit(1)
}
