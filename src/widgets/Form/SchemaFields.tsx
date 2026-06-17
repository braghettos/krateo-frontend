import { Form as AntdForm, Input, InputNumber, Select, Switch } from 'antd'
import type { JSONSchema4 } from 'json-schema'

import styles from './Form.module.css'
import { getOptionsFromEnum } from './utils'

/**
 * Renders an antd form control for a single (scalar) schema node. The schema-driven
 * alternative to composing control widgets — used when a Form is fed a JSON schema
 * (e.g. a blueprint CRD's `openAPIV3Schema` spec) instead of `items`.
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
