import type { DefaultOptionType } from 'antd/es/select'
import type { JSONSchema4, JSONSchema4Type } from 'json-schema'

export const getDefaultsFromSchema = (schema: JSONSchema4): Record<string, unknown> => {
  const defaults: Record<string, unknown> = {}

  if (schema.properties) {
    for (const [key, prop] of Object.entries(schema.properties)) {
      const node = prop
      if (node.type === 'object' && node.properties) {
        // Nested object with a known shape — recurse so its scalar defaults apply.
        defaults[key] = getDefaultsFromSchema(node)
      } else if (node.default !== undefined) {
        defaults[key] = node.default
      }
      // A property-less object (free-form map, e.g. x-kubernetes-preserve-unknown-fields)
      // with no default is intentionally left undefined — no spurious `{}` to render as
      // "[object Object]" in a text input or to submit as an empty map.
    }
  }

  return defaults
}

export const getOptionsFromEnum = (enumValues: JSONSchema4Type[] | undefined): DefaultOptionType[] | undefined => {
  if (!Array.isArray(enumValues)) { return undefined }

  return enumValues
    .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
    .map((value) => ({ label: String(value), value }))
}
