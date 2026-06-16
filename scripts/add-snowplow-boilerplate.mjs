/* eslint-disable no-console */
/*
 * Idempotent fixer: ensure every widget X.schema.json declares the five mandatory
 * snowplow properties under spec.properties:
 *   apiRef, widgetData, widgetDataTemplate, resourcesRefs, resourcesRefsTemplate
 *
 * This script ONLY ADDS missing boilerplate properties. It NEVER touches widgetData,
 * never reorders/rewrites existing properties, and preserves additionalProperties:false.
 *
 * Formatting is preserved surgically: existing file bytes are left 100% intact. The new
 * property blocks are serialized with 2-space indentation and spliced in just before the
 * closing brace of spec.properties — exactly how boilerplate already appears (multi-line)
 * in the schemas that have it (Menu, Layout, List).
 *
 * Canonical shapes mirror the krateoctl-generated CRDs (scripts/krateoctl-output/*.crd.yaml)
 * and the snowplow apis/templates/v1 Go structs — krateoctl injects these same blocks
 * during CRD generation, so the JSON-Schema source and the generated CRD agree.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { glob } from 'glob'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WIDGETS_DIR = path.resolve(__dirname, '../src/widgets')

const apiRef = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    namespace: { type: 'string' },
  },
  required: ['name', 'namespace'],
  additionalProperties: false,
}

const widgetDataTemplate = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      forPath: { type: 'string' },
      expression: { type: 'string' },
    },
    additionalProperties: false,
  },
}

const resourcesRefs = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          allowed: { type: 'boolean' },
          apiVersion: { type: 'string' },
          id: { type: 'string' },
          name: { type: 'string' },
          namespace: { type: 'string' },
          payload: { type: 'object' },
          resource: { type: 'string' },
          verb: {
            type: 'string',
            enum: ['POST', 'PUT', 'PATCH', 'DELETE', 'GET'],
          },
          slice: {
            type: 'object',
            properties: {
              offset: { type: 'integer' },
              page: { type: 'integer' },
              perPage: { type: 'integer' },
              continue: { type: 'boolean' },
            },
            required: ['page', 'perPage'],
          },
        },
        required: ['allowed', 'id'],
      },
    },
  },
  required: ['items'],
}

const resourcesRefsTemplate = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      iterator: { type: 'string' },
      template: {
        type: 'object',
        properties: {
          apiVersion: { type: 'string' },
          id: { type: 'string' },
          name: { type: 'string' },
          namespace: { type: 'string' },
          payload: { type: 'object' },
          resource: { type: 'string' },
          verb: {
            type: 'string',
            enum: ['POST', 'PUT', 'PATCH', 'DELETE', 'GET'],
          },
        },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  },
}

const CANONICAL = { apiRef, widgetDataTemplate, resourcesRefs, resourcesRefsTemplate }
// Order in which we APPEND missing props (widgetData is never added by us).
const APPEND_ORDER = ['apiRef', 'widgetDataTemplate', 'resourcesRefs', 'resourcesRefsTemplate']

/**
 * Find the [start,end) of the OBJECT value (the `{...}`) of `"<key>":` at the given
 * search offset, by brace-matching while respecting strings/escapes. Returns the index
 * of the value's opening `{` and of its matching closing `}`.
 */
function findObjectValueSpan(text, keyOffset) {
  // advance past the key token to its colon, then to the opening brace
  let i = keyOffset
  while (i < text.length && text[i] !== ':') { i += 1 }
  while (i < text.length && text[i] !== '{') { i += 1 }
  const open = i
  let depth = 0
  let inStr = false
  for (; i < text.length; i += 1) {
    const c = text[i]
    if (inStr) {
      if (c === '\\') { i += 1; continue }
      if (c === '"') { inStr = false }
      continue
    }
    if (c === '"') { inStr = true; continue }
    if (c === '{') { depth += 1 }
    else if (c === '}') {
      depth -= 1
      if (depth === 0) { return { open, close: i } }
    }
  }
  throw new Error('unbalanced braces while locating object value')
}

/** Locate the spec.properties object value span in the raw schema text. */
function findSpecPropertiesSpan(text) {
  const specIdx = text.indexOf('"spec"')
  if (specIdx < 0) { throw new Error('no "spec" key') }
  const specSpan = findObjectValueSpan(text, specIdx)
  const propsIdx = text.indexOf('"properties"', specSpan.open)
  if (propsIdx < 0 || propsIdx > specSpan.close) { throw new Error('no spec.properties') }
  return findObjectValueSpan(text, propsIdx)
}

/** Detect indent (spaces) of the first property line inside an object span. */
function detectChildIndent(text, span) {
  // find first newline after the opening brace, then count leading spaces
  const nl = text.indexOf('\n', span.open)
  let i = nl + 1
  let n = 0
  while (i < text.length && text[i] === ' ') { n += 1; i += 1 }
  return n
}

/** Serialize a value at a given base indent (2-space step), without a leading indent on line 1. */
function serializeAtIndent(value, baseIndent) {
  const json = JSON.stringify(value, null, 2)
  // re-indent every line except the first by baseIndent spaces
  const pad = ' '.repeat(baseIndent)
  return json
    .split('\n')
    .map((line, idx) => (idx === 0 ? line : pad + line))
    .join('\n')
}

async function main() {
  const files = await glob('**/*.schema.json', { absolute: true, cwd: WIDGETS_DIR })
  files.sort()

  let changedCount = 0
  const changedDetail = []

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8')
    const schema = JSON.parse(raw)

    const specProps = schema?.properties?.spec?.properties
    if (!specProps) {
      console.error(`!  ${path.basename(file)}: no properties.spec.properties — skipped`)
      continue
    }

    const missing = APPEND_ORDER.filter((k) => !(k in specProps))
    if (missing.length === 0) { continue }

    const span = findSpecPropertiesSpan(raw)
    const childIndent = detectChildIndent(raw, span)
    const pad = ' '.repeat(childIndent)

    // Build the text to insert: ",\n<indent>\"key\": <serialized>" for each missing key.
    let insertion = ''
    for (const key of missing) {
      const body = serializeAtIndent(CANONICAL[key], childIndent)
      insertion += `,\n${pad}${JSON.stringify(key)}: ${body}`
    }

    // The last existing property ends just before span.close. Find the char before the
    // closing brace that is the end of the last property (skip trailing whitespace/newline).
    let insertAt = span.close - 1
    while (insertAt > span.open && /\s/.test(raw[insertAt])) { insertAt -= 1 }
    insertAt += 1 // position right after the last non-space char of the last property

    const next = raw.slice(0, insertAt) + insertion + raw.slice(insertAt)

    // Validate the result parses and is structurally what we intended.
    const reparsed = JSON.parse(next)
    const after = reparsed.properties.spec.properties
    for (const key of missing) {
      if (JSON.stringify(after[key]) !== JSON.stringify(CANONICAL[key])) {
        throw new Error(`post-insert mismatch for ${key} in ${file}`)
      }
    }

    await fs.writeFile(file, next)
    changedCount += 1
    changedDetail.push(`${path.basename(file).replace('.schema.json', '')}: +${missing.join(', +')}`)
  }

  console.log(`\nChanged ${changedCount} of ${files.length} schema files:`)
  for (const d of changedDetail) { console.log(`  - ${d}`) }
  if (changedCount === 0) { console.log('  (none — all schemas already compliant)') }
}

void main()
