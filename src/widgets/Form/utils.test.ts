import type { JSONSchema4 } from 'json-schema'
import { describe, expect, it } from 'vitest'

import { getDefaultsFromSchema, getOptionsFromEnum } from './utils'

describe('getDefaultsFromSchema', () => {
  it('collects scalar defaults and omits properties without one', () => {
    const schema: JSONSchema4 = {
      properties: {
        enabled: { default: false, type: 'boolean' },
        name: { type: 'string' },
        replicas: { default: 3, type: 'integer' },
      },
      type: 'object',
    }
    expect(getDefaultsFromSchema(schema)).toEqual({ enabled: false, replicas: 3 })
  })

  it('recurses into nested objects', () => {
    const schema: JSONSchema4 = {
      properties: {
        storage: {
          properties: {
            size: { default: 100, type: 'integer' },
            tier: { default: 'standard', type: 'string' },
          },
          type: 'object',
        },
      },
      type: 'object',
    }
    expect(getDefaultsFromSchema(schema)).toEqual({ storage: { size: 100, tier: 'standard' } })
  })

  it('returns an empty object for a schema without properties', () => {
    expect(getDefaultsFromSchema({ type: 'object' })).toEqual({})
  })
})

describe('getOptionsFromEnum', () => {
  it('maps string/number enum values to antd options', () => {
    expect(getOptionsFromEnum(['dev', 'prod', 5])).toEqual([
      { label: 'dev', value: 'dev' },
      { label: 'prod', value: 'prod' },
      { label: '5', value: 5 },
    ])
  })

  it('drops non-scalar enum values', () => {
    expect(getOptionsFromEnum(['ok', true, null, { a: 1 }] as never)).toEqual([{ label: 'ok', value: 'ok' }])
  })

  it('returns undefined when there is no enum', () => {
    expect(getOptionsFromEnum(undefined)).toBeUndefined()
  })
})
