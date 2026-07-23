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
      autoSize={{ maxRows: 12, minRows: 2 }}
      onChange={handleChange}
      placeholder='{ } — JSON (key/value map)'
      status={invalid ? 'error' : undefined}
      style={{ fontFamily: 'var(--font-mono, monospace)' }}
      value={text}
    />
  )
}

/** Renders an antd form control for a single schema node (the schema-driven control). */
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

const isGroup = (node: JSONSchema4): boolean => node.type === 'object' && !!node.properties

/**
 * One COHERENT header for every property — the property `name` (the schema key) and its
 * `description` (muted, if present). Used identically for scalars, toggles, maps and
 * nested-object groups so the whole form reads as one system.
 */
const fieldHeader = (key: string, node: JSONSchema4, isRequired: boolean): React.ReactNode => {
  const description = typeof node.description === 'string' ? node.description : ''
  return (
    <span className={styles.fieldLabel}>
      <span className={styles.fieldName}>
        {key}
        {isRequired ? <span className={styles.req}> *</span> : null}
      </span>
      {description ? <span className={styles.fieldDesc}>{description}</span> : null}
    </span>
  )
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
 * Schema-driven fields, rendered in EXACT `values.schema.json` order (each property in
 * sequence — never reordered). Every property uses one coherent shape: the `name`+
 * `description` header (see `fieldHeader`) above its control. The control is the only thing
 * that varies by type — Input / Switch / Select / InputNumber / JSON editor — and a nested
 * object is the same header above its child fields, indented. The `Form.Item` `name` (and
 * `required`/`valuePropName`) is preserved verbatim, so submission is unchanged.
 */
export const SchemaFields = ({ hide = [], namePath = [], schema }: SchemaFieldsProps): React.ReactNode => {
  if (!schema?.properties) { return null }
  const required = new Set(Array.isArray(schema.required) ? schema.required : [])

  return (
    <>
      {Object.entries(schema.properties).map(([key, node]) => {
        if (hide.includes(key)) { return null }
        const path = [...namePath, key]

        if (isGroup(node)) {
          return (
            <div className={styles.group} key={path.join('.')}>
              {fieldHeader(key, node, false)}
              <div className={styles.groupBody}>
                <SchemaFields hide={hide} namePath={path} schema={node} />
              </div>
            </div>
          )
        }

        return (
          // The label is a stacked name + (wrapping) description meant to sit ABOVE the control.
          // Force full-width label/wrapper columns so that stays true even when the Form's
          // `layout` is 'horizontal' — otherwise antd puts the label beside the control and a long
          // description crowds/overlaps it. A no-op for vertical/inline layouts (already stacked).
          <AntdForm.Item
            className={styles.field}
            colon={false}
            hasFeedback={required.has(key) && node.type !== 'boolean'}
            key={path.join('.')}
            label={fieldHeader(key, node, required.has(key))}
            labelCol={{ span: 24 }}
            name={path}
            rules={required.has(key) ? [{ message: `${key} is required`, required: true }] : undefined}
            valuePropName={node.type === 'boolean' ? 'checked' : undefined}
            wrapperCol={{ span: 24 }}
          >
            {controlFor(node)}
          </AntdForm.Item>
        )
      })}
    </>
  )
}

interface Section { id: string; label: string }

/**
 * Section-navigated schema form for COMPLEX blueprints (e.g. the installer's ~680 fields):
 * a left rail of sections — "Top-level values" (the root's ungrouped, non-object properties)
 * plus one per top-level object group — and a body showing only the active section. Every
 * section stays mounted (hidden, not unmounted) so all values + validation persist for
 * submission; only the active one is shown. Falls back to a flat render when there's <2
 * sections. The "Top-level values" entry is the ONE synthetic label (no matching schema key)
 * — it is styled distinctly in the rail so it reads as a category, not a real property.
 */
export const SchemaForm = ({ hide = [], schema }: { schema: JSONSchema4; hide?: string[] }): React.ReactNode => {
  const properties = (schema.properties ?? {}) as Record<string, JSONSchema4>
  const groupKeys = Object.keys(properties).filter((key) => !hide.includes(key) && isGroup(properties[key]))
  const hasLoose = Object.keys(properties).some((key) => !hide.includes(key) && !isGroup(properties[key]))

  const sections: Section[] = []
  if (hasLoose) { sections.push({ id: '__general__', label: 'Top-level values' }) }
  groupKeys.forEach((key) => sections.push({ id: key, label: key }))

  const [active, setActive] = useState<string>(sections[0]?.id ?? '__general__')

  if (sections.length < 2) {
    return <SchemaFields hide={hide} schema={schema} />
  }

  return (
    <div className={styles.sectioned}>
      <nav className={styles.secNav}>
        {sections.map((section) => (
          <button
            className={[
              styles.secItem,
              active === section.id ? styles.secActive : '',
              section.id === '__general__' ? styles.secSynthetic : '',
            ].filter(Boolean).join(' ')}
            key={section.id}
            onClick={() => { setActive(section.id) }}
            type='button'
          >
            {section.label}
          </button>
        ))}
      </nav>
      <div className={styles.secBody}>
        {sections.map((section) => (
          <div key={section.id} style={active === section.id ? undefined : { display: 'none' }}>
            {section.id === '__general__'
              ? <SchemaFields hide={[...hide, ...groupKeys]} schema={schema} />
              : <SchemaFields hide={hide} namePath={[section.id]} schema={properties[section.id]} />}
          </div>
        ))}
      </div>
    </div>
  )
}

export default SchemaFields
