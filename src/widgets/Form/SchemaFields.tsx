import { Form as AntdForm, Input, InputNumber, Select, Switch } from 'antd'
import type { JSONSchema4 } from 'json-schema'
import { useState } from 'react'

import styles from './Form.module.css'
import { getOptionsFromEnum } from './utils'

/**
 * Editor for a free-form object/array node (a `type: object` map without `properties`,
 * e.g. `x-kubernetes-preserve-unknown-fields` like a `tags`/`labels` map, or a non-string
 * array). antd injects `value`/`onChange`: the value stays a real object/array — edited as
 * JSON — so it is submitted correctly and never rendered as the string "[object Object]".
 * Invalid JSON shows an error and holds the last valid value; empty clears it.
 */
const JsonValueInput = ({ onChange, value }: { onChange?: (next: unknown) => void; value?: unknown }): React.ReactNode => {
  const [text, setText] = useState<string>(() => (value === undefined || value === null ? '' : JSON.stringify(value, null, 2)))
  const [invalid, setInvalid] = useState(false)

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value
    setText(next)
    if (next.trim() === '') {
      setInvalid(false)
      onChange?.(undefined)
      return
    }
    try {
      const parsed: unknown = JSON.parse(next)
      setInvalid(false)
      onChange?.(parsed)
    } catch {
      setInvalid(true)
    }
  }

  return (
    <Input.TextArea
      autoSize={{ maxRows: 10, minRows: 2 }}
      onChange={handleChange}
      placeholder='{ } — JSON (key/value map)'
      status={invalid ? 'error' : undefined}
      style={{ fontFamily: 'var(--font-mono, monospace)' }}
      value={text}
    />
  )
}

/**
 * Renders an antd form control for a single schema node. The schema-driven alternative to
 * composing control widgets — used when a Form is fed a JSON schema (e.g. a blueprint CRD's
 * `openAPIV3Schema` spec) instead of `items`. Objects WITH `properties` are handled by the
 * caller (a recursive fieldset); a property-less object/array reaching here is a free-form
 * map, edited as JSON.
 */
const controlFor = (node: JSONSchema4): React.ReactNode => {
  if (Array.isArray(node.enum)) {
    return <Select allowClear options={getOptionsFromEnum(node.enum)} placeholder='Select…' />
  }
  if (node.type === 'boolean') { return <Switch /> }
  if (node.type === 'integer' || node.type === 'number') { return <InputNumber style={{ width: '100%' }} /> }
  if (node.type === 'array' && !Array.isArray(node.items) && node.items?.type === 'string') {
    return <Select allowClear mode='tags' placeholder='Add values…' />
  }
  if (node.type === 'object' || node.type === 'array') { return <JsonValueInput /> }
  return <Input />
}

interface SchemaFieldsProps {
  /** the (sub)schema whose `properties` become form fields */
  schema: JSONSchema4
  /** top-level property names to omit (e.g. legacy CustomForm `propertiesToHide`) */
  hide?: string[]
  /** parent path — antd `Form.Item` name for nested objects (e.g. ['spec', 'size']) */
  namePath?: string[]
}

/**
 * Recursively renders antd `Form.Item`s from a JSON schema's `properties`. Objects
 * recurse into a nested fieldset (carrying the dotted `name` path); enums → Select,
 * boolean → Switch, number/integer → InputNumber, string-array → tag Select, else
 * Input. `required` and `description` come from the schema; defaults are applied by
 * the parent Form via `getDefaultsFromSchema`.
 */
export const SchemaFields = ({ hide = [], namePath = [], schema }: SchemaFieldsProps): React.ReactNode => {
  if (!schema?.properties) { return null }
  const required = new Set(Array.isArray(schema.required) ? schema.required : [])

  return (
    <>
      {Object.entries(schema.properties).map(([key, node]) => {
        if (hide.includes(key)) { return null }
        const path = [...namePath, key]
        const label = (typeof node.title === 'string' && node.title) || key

        if (node.type === 'object' && node.properties) {
          return (
            <fieldset className={styles.fieldset} key={path.join('.')}>
              <legend className={styles.legend}>{label}</legend>
              <SchemaFields hide={hide} namePath={path} schema={node} />
            </fieldset>
          )
        }

        return (
          <AntdForm.Item
            key={path.join('.')}
            label={label}
            name={path}
            rules={required.has(key) ? [{ message: `${label} is required`, required: true }] : undefined}
            tooltip={typeof node.description === 'string' ? node.description : undefined}
            valuePropName={node.type === 'boolean' ? 'checked' : undefined}
          >
            {controlFor(node)}
          </AntdForm.Item>
        )
      })}
    </>
  )
}

export default SchemaFields
