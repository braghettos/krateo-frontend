/* eslint-disable max-lines */
import { Anchor, Col, Form, Input, InputNumber, Radio, Row, Select, Slider, Space, Switch, Typography } from 'antd'
import type { FormInstance } from 'antd'
import type { AnchorLinkItemProps } from 'antd/es/anchor/Anchor'
import type { Rule } from 'antd/es/form'
import type { DefaultOptionType } from 'antd/es/select'
import type { JSONSchema4 } from 'json-schema'
import type { ValidateErrorEntity } from 'rc-field-form/lib/interface'
import { useCallback, useEffect, useMemo, useState } from 'react'

import ListEditor from '../../components/ListEditor'
import ListObjectFields from '../../components/ListObjectFields'
import type { ResourcesRefs } from '../../types/Widget'

import AsyncSelect from './fields/AsyncSelect'
import AutoComplete from './fields/AutoComplete'
import type { FormWidgetData } from './Form'
import styles from './Form.module.css'
import { getOptionsFromEnum } from './utils'

type FormGeneratorType = {
  descriptionTooltip: boolean
  formId: string
  onSubmit: (values: Record<string, unknown>) => Promise<void>
  resourcesRefs: ResourcesRefs
  schema: JSONSchema4
  autocomplete?: FormWidgetData['autocomplete']
  dependencies?: FormWidgetData['dependencies']
  objectFields?: FormWidgetData['objectFields']
  initialValues?: FormWidgetData['initialValues']
  // antd Form props
  layout?: 'horizontal' | 'vertical' | 'inline'
  size?: 'small' | 'middle' | 'large'
  disabled?: boolean
}

const getOptionalCount = (node: JSONSchema4, requiredFields: string[]) => {
  const currentProperties = node.properties
  let totalCount = 0
  let optionalCount = 0

  if (currentProperties && typeof currentProperties === 'object') {
    for (const key of Object.keys(currentProperties)) {
      const prop = currentProperties[key]

      if (prop.type === 'object') {
        const counts = getOptionalCount(prop, requiredFields)
        totalCount += counts.totalCount
        optionalCount += counts.optionalCount
      } else {
        const required = (Array.isArray(node?.required) && node.required.indexOf(key) > -1) || requiredFields.indexOf(key) > -1
        totalCount += 1
        optionalCount = required ? optionalCount : optionalCount + 1
      }
    }
  }
  return { optionalCount, totalCount }
}

const isObjectSchema = (property: JSONSchema4) => {
  return property.type === 'object' ||
    (Array.isArray(property.type) && property.type.includes('object')) ||
    (!!property.properties && typeof property.properties === 'object')
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const getInitialValue = (object: unknown, path: string): unknown => {
  const pathParts = path.split('.')

  let value: unknown = object

  for (const pathKey of pathParts) {
    if (!isRecord(value)) { return undefined }
    if (!(pathKey in value)) { return undefined }

    value = value[pathKey]
  }

  return value
}

const FormGenerator = ({
  autocomplete,
  dependencies,
  descriptionTooltip = false,
  disabled,
  formId,
  initialValues,
  layout,
  objectFields,
  onSubmit,
  resourcesRefs,
  schema,
  size,
}: FormGeneratorType) => {
  const [form] = Form.useForm()
  const requiredFields: string[] = Array.isArray(schema.required) ? schema.required : []
  const [optionalHidden, setOptionalHidden] = useState<boolean>(false)

  const [transformedInitialValues, setTransformedInitialValues] = useState<FormWidgetData['initialValues'] | undefined>(undefined)

  const { optionalCount, totalCount } = getOptionalCount(schema, requiredFields)

  const hasOptionalFields = useMemo(() => optionalCount > 0 && optionalCount < totalCount, [optionalCount, totalCount])

  const setInitialValues = useCallback(() => {
    const isOptionField = (fieldName: string) => {
      const autocompleteNames = (autocomplete ?? []).map(({ name }) => name)
      const dependenciesNames = (dependencies ?? []).map(({ name }) => name)
      return autocompleteNames.includes(fieldName) || dependenciesNames.includes(fieldName)
    }

    const hasDependencyChanged = (fieldName: string): boolean => {
      const dependsOnField = dependencies?.find(({ name }) => name === fieldName)?.dependsOn.name
      if (!dependsOnField) { return false }

      const current = form.getFieldValue(dependsOnField) as unknown
      const initial = getInitialValue(initialValues, dependsOnField)

      if (!initial) {
        return false
      }

      return JSON.stringify(current) !== JSON.stringify(initial)
    }

    const formatValue = (currentPath: string, property: JSONSchema4, valueToSet: unknown) => {
      let formattedValue = valueToSet

      // Sets correct format for string fields
      if (!isOptionField(currentPath) && property.type === 'string' && typeof formattedValue !== 'string') {
        console.warn(`Invalid string default for ${currentPath}`, formattedValue)

        if (typeof formattedValue === 'number' || typeof formattedValue === 'boolean' || typeof formattedValue === 'bigint' || typeof formattedValue === 'symbol') {
          formattedValue = formattedValue.toString()
        } else {
          formattedValue = undefined
        }
      }

      // Sets correct format for numeric fields
      if ((property.type === 'integer' || property.type === 'number') && typeof formattedValue !== 'number') {
        console.warn(`Invalid number default for ${currentPath}`, formattedValue)
        formattedValue = undefined
      }

      // Sets correct format for boolean fields
      if (property.type === 'boolean' && typeof formattedValue !== 'boolean') {
        console.warn(`Invalid boolean initialValue for "${currentPath}"`, formattedValue)
        formattedValue = false
      }

      // Sets correct format for Autocomplete and Dependencies fields
      if (isOptionField(currentPath)) {
        if (typeof formattedValue === 'string' || typeof formattedValue === 'number') {
          formattedValue = { label: String(formattedValue), value: formattedValue } as DefaultOptionType
        } else if (typeof formattedValue === 'boolean') {
          formattedValue = { label: formattedValue ? 'true' : 'false', value: String(formattedValue) } as DefaultOptionType
        } else if (Array.isArray(formattedValue)) {
          console.warn(`Invalid array initialValue for option field "${currentPath}"`, formattedValue)
          formattedValue = undefined
        } else if (typeof formattedValue === 'object' && formattedValue !== null) {
          if ('label' in formattedValue && 'value' in formattedValue && typeof formattedValue.label === 'string') {
            formattedValue = formattedValue as DefaultOptionType
          } else {
            console.warn(`Invalid object initialValue for option field "${currentPath}"`, formattedValue)
            formattedValue = undefined
          }
        }
      }

      // Sets correct format for array fields
      if (property.type === 'array') {
        const { items } = property

        // Objects
        if (items && !Array.isArray(items) && items.type === 'object') {
          if (!Array.isArray(formattedValue)) {
            console.warn(`Invalid array value for object array "${currentPath}"`, formattedValue)
            formattedValue = undefined
          } else {
            const isValid = formattedValue.every((el) => typeof el === 'object' && el !== null && !Array.isArray(el))

            if (!isValid) {
              console.warn(`Invalid object array structure for "${currentPath}"`, formattedValue)
              formattedValue = undefined
            }
          }
        }

        // Primitive / enum / string / number
        if (formattedValue === undefined) {
          formattedValue = []
        } else if (!Array.isArray(formattedValue)) {
          formattedValue = [formattedValue]
        }
      }

      return formattedValue
    }

    const newInitialValues: Record<string, unknown> = {}

    const parseInitialValues = (schemaNode: JSONSchema4, path: string = ''): void => {
      const { properties } = schemaNode
      if (!properties) { return }

      for (const key of Object.keys(properties)) {
        const property = properties[key]
        const currentPath = path ? `${path}.${key}` : key
        const namePath = currentPath.split('.')

        if (isObjectSchema(property)) {
          parseInitialValues(property, currentPath)
          continue
        }

        // Value just updated from the user has priority
        const hasBeenUpdated = form.isFieldTouched(namePath)
        if (hasBeenUpdated) {
          const valueToSet = form.getFieldValue(namePath) as unknown

          form.setFieldValue(namePath, valueToSet)
          newInitialValues[currentPath] = valueToSet
          continue
        }

        // If the user has not set a value, takes the initial or default value
        const initialValue = getInitialValue(initialValues, currentPath)
        let valueToSet = initialValue ?? property.default

        if (valueToSet === undefined) {
          continue
        }

        // Dependencies have an additional check to make sure that if the parent field has been updated
        // the children field initial value is not set
        if (hasDependencyChanged(currentPath)) {
          valueToSet = undefined
        }

        // If the value has not been inserted from the user, checks its format
        valueToSet = formatValue(currentPath, property, valueToSet)

        form.setFieldValue(currentPath.split('.'), valueToSet)
        newInitialValues[currentPath] = valueToSet
      }
    }

    parseInitialValues(schema)
    setTransformedInitialValues(newInitialValues)
  }, [schema, autocomplete, dependencies, initialValues, form])

  useEffect(() => {
    setInitialValues()
  }, [setInitialValues])

  const renderLabel = (path: string, label: string) => {
    const breadcrumb = path.split('.')
    breadcrumb.splice(-1)

    return (
      <Space className={styles.labelField} direction='vertical' size='small'>
        <Typography.Text strong>{label}</Typography.Text>
        <Space className={styles.breadcrumb} title={breadcrumb.join(' > ')}>
          {breadcrumb.map((el, index) => {
            if (index < breadcrumb.length - 1) {
              if (index === 2 && breadcrumb.length > 3) {
                return (
                  <Typography.Text className={styles.breadcrumbDots} key={`label_breadcrumb_${index}`}>
                    ... <span> &rsaquo; </span>
                  </Typography.Text>
                )
              } else if (index > 2 && index < breadcrumb.length - 1 && breadcrumb.length > 3) {
                return ''
              }
              return (
                <Typography.Text ellipsis key={`label_breadcrumb_${index}`}>
                  {el} <span> &rsaquo; </span>
                </Typography.Text>
              )
            }
            return (
              <Typography.Text ellipsis key={`label_breadcrumb_${index}`}>
                {el}
              </Typography.Text>
            )
          })}
        </Space>
      </Space>
    )
  }

  const parseData = (
    { properties, required }: JSONSchema4,
    name: string[] = [],
    parentIsRequired: boolean = true,
    formInstance?: FormInstance,
  ): React.ReactNode[] => {
    const currentForm = formInstance ?? form

    if (properties) {
      const requiredFields = Array.isArray(required) ? required : []

      return Object.keys(properties).flatMap((key) => {
        const currentPath = [...name, key]
        const property = properties[key]

        const isRequired = requiredFields.includes(key) && parentIsRequired

        if (isObjectSchema(property)) {
          return parseData(property, currentPath, isRequired, currentForm)
        }

        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        return [renderField(property.title || key, currentPath.join('.'), property, isRequired, currentForm)]
      })
    }

    return []
  }

  const renderField = (label: string, name: string, node: JSONSchema4, required: boolean, formInstance?: FormInstance) => {
    const currentForm = formInstance ?? form

    if (!node.type) {
      console.error(`Field ${name} does not have a type in the schema or stringSchema`)
      return null
    }

    if (Array.isArray(node.type)) {
      console.error(`type as array is not supported: ${node.type.join(',')} for field ${name}`)
      return null
    }

    const rules: Rule[] = []

    if (required) {
      rules.push({ message: 'Insert a value', required: true })
    }

    if (node.pattern) {
      rules.push({ message: 'Insert right value', pattern: new RegExp(node.pattern) })
    }

    switch (node.type) {
      case 'string': {
        const formItemContent = (() => {
          // AsyncSelect
          if (dependencies) {
            const data = dependencies.find(field => field.name === name)

            if (data) {
              return (
                <AsyncSelect
                  data={data}
                  form={currentForm}
                  initialValue={getInitialValue(transformedInitialValues, name) as DefaultOptionType | undefined}
                  resourcesRefs={resourcesRefs}
                />
              )
            }
          }

          const options = getOptionsFromEnum(node.enum)

          // Autocomplete
          if (autocomplete) {
            const data = autocomplete.find(field => field.name === name)

            if (data) {
              return (
                <AutoComplete
                  data={data}
                  form={currentForm}
                  initialValue={getInitialValue(transformedInitialValues, name) as DefaultOptionType | undefined}
                  options={options}
                  resourcesRefs={resourcesRefs}
                />
              )
            }
          }

          // Enum
          if (options) {
            const currentValue = getInitialValue(transformedInitialValues, name)
            const optionExists = options.some(({ value }) => String(value) === String(currentValue))

            if (currentValue !== undefined && !optionExists) {
              console.warn(`Invalid initial value for "${name}"`, currentValue)
              form.setFieldValue(name.split('.'), undefined)
            }

            if (options.length > 4) {
              return <Select allowClear options={options} />
            }

            return (
              <Radio.Group>
                {options.map(({ label, value }) => (
                  <Radio key={`radio_${value}`} value={value}>
                    {label}
                  </Radio>
                ))}
              </Radio.Group>
            )
          }

          // Default
          return <Input />
        })()

        return (
          <div className={`${styles.formField} ${optionalHidden && !required ? styles.hidden : 'auto'}`} id={name}>
            <Form.Item
              extra={!descriptionTooltip && node.description ? node.description : undefined}
              hidden={optionalHidden && !required}
              key={name}
              label={renderLabel(name, label)}
              name={name.split('.')}
              preserve={false}
              rules={rules}
              tooltip={descriptionTooltip && node.description ? node.description : undefined}
            >
              {formItemContent}
            </Form.Item>
          </div>
        )
      }

      case 'boolean':
        return (
          <div className={`${styles.formField} ${optionalHidden && !required ? styles.hidden : 'auto'}`} id={name}>
            <Space direction='vertical' style={{ width: '100%' }}>
              <Form.Item
                extra={!descriptionTooltip && node.description ? node.description : undefined}
                hidden={optionalHidden && !required}
                key={name}
                label={renderLabel(name, label)}
                name={name.split('.')}
                preserve={true}
                rules={rules}
                tooltip={descriptionTooltip && node.description ? node.description : undefined}
                valuePropName='checked'
              >
                <Switch />
              </Form.Item>
            </Space>
          </div>
        )

      case 'array': {
        const formItemContent = (() => {
          // objects
          if (objectFields && node.items) {
            const objFields = objectFields.find(({ path }) => path === name)
            if (objFields) {
              return (
                <ListObjectFields
                  container={document.body}
                  displayField={objFields.displayField}
                  fields={(drawerForm: FormInstance) => parseData(node.items as JSONSchema4, [], true, drawerForm)}
                  onChange={(values) => form.setFieldValue(name.split('.'), values)}
                  schema={node.items as JSONSchema4}
                  value={(form.getFieldValue(name.split('.')) as unknown[]) || []}
                />
              )
            }
          }

          // strings
          const options = node.items && !Array.isArray(node.items) ? getOptionsFromEnum(node.items.enum) : undefined
          if (options) {
            return <Select allowClear mode='multiple' options={options} />
          }

          return (
            <ListEditor
              data={getInitialValue(transformedInitialValues, name) as string[] || []}
              onChange={(values) => {
                form.setFieldValue(name.split('.'), values)
              }}
            />
          )
        })()

        return (
          <div className={`${styles.formField} ${optionalHidden && !required ? styles.hidden : 'auto'}`} id={name}>
            <Form.Item
              extra={!descriptionTooltip && node.description ? node.description : undefined}
              hidden={optionalHidden && !required}
              key={name}
              label={renderLabel(name, label)}
              name={name.split('.')}
              rules={rules}
              tooltip={descriptionTooltip && node.description ? node.description : undefined}
            >
              {formItemContent}
            </Form.Item>
          </div>
        )
      }

      case 'integer': {
        const min = node.minimum
        const max = node.maximum

        const existing = form.getFieldValue(name.split('.')) as number | undefined
        if (existing === undefined && min !== undefined) {
          form.setFieldValue(name.split('.'), min)
        }

        return (
          <div className={`${styles.formField} ${optionalHidden && !required ? styles.hidden : 'auto'}`} id={name}>
            <Form.Item
              extra={!descriptionTooltip && node.description ? node.description : undefined}
              hidden={optionalHidden && !required}
              key={name}
              label={renderLabel(name, label)}
              name={name.split('.')}
              rules={rules}
              tooltip={descriptionTooltip && node.description ? node.description : undefined}
            >
              {min && max && max - min < 100 ? (
                <Slider className={styles.slider} max={max} min={min} step={1} />
              ) : (
                <InputNumber max={max ? max : undefined} min={min ? min : 0} step={1} style={{ width: '100%' }} />
              )}
            </Form.Item>
          </div>
        )
      }
    }
  }

  const getAnchorList = (): AnchorLinkItemProps[] => {
    const parseData = (
      node: JSONSchema4,
      name = '',
      parentIsRequired = true
    ): AnchorLinkItemProps[] => {
      const currentProperties = node.properties
      const requiredFields = Array.isArray(node.required) ? node.required : []

      if (!currentProperties) { return [] }

      return Object.keys(currentProperties).flatMap((key) => {
        const schemaItem = currentProperties[key]
        const currentName = name ? `${name}.${key}` : key

        const isRequired = requiredFields.includes(key) && parentIsRequired

        const children = schemaItem.type === 'object'
          ? parseData(schemaItem, currentName, isRequired)
          : []

        const shouldShow = isRequired || children.length > 0 || !optionalHidden
        if (!shouldShow) { return [] }

        return [
          {
            href: schemaItem.type === 'object' ? '#' : `#${currentName}`,
            key: currentName,
            title:
            schemaItem.type === 'object' ? (
              <span className={styles.anchorObjectLabel}>{key}</span>
            ) : (
              key
            ),
            ...(children.length > 0 ? { children } : {}),
          },
        ]
      })
    }

    return parseData(schema)
  }

  const onFinishFailed = useCallback(({ errorFields }: ValidateErrorEntity) => {
    const errorField = errorFields[0].name.join('.')
    const errorFieldElement = document.querySelector(`#${CSS.escape(errorField)}`)

    if (errorFieldElement) {
      errorFieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

      const inputElement = errorFieldElement.querySelector('input, textarea, select') as HTMLElement
      if (inputElement) {
        requestAnimationFrame(() => inputElement.focus())
      }
    }

    const anchorLink = document.querySelector(`a[href='#${CSS.escape(errorField)}']`) as HTMLAnchorElement
    if (anchorLink) {
      anchorLink.click()
      anchorLink.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  const handleAnchorClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault()
    const linkElement = event.currentTarget as HTMLAnchorElement
    const [_, href] = linkElement.href.split('#') /* only take the part after the # */
    const element = document.getElementById(href)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      console.warn(`Anchor link ${href} not found`)
    }
  }

  return (
    <div className={styles.formGenerator}>
      <div className={styles.anchorWrapper}>
        <Row className={styles.anchorRow}>
          <Col className={styles.formWrapper} flex='2 1 0'>
            <div className={styles.form} id='anchor-content'>
              {
                hasOptionalFields && (
                  <div className={styles.optionalFieldsSwitchWrapper}>
                    <Space className={styles.optionalFieldsSwitch} direction='horizontal' size='small'>
                      <Switch onChange={(value) => setOptionalHidden(value) } value={optionalHidden} />
                      <Typography.Text>
                        Hide optional fields
                      </Typography.Text>
                    </Space>
                  </div>
                )
              }
              <Form
                autoComplete='off'
                disabled={disabled}
                form={form}
                id={formId}
                layout={layout ?? 'vertical'}
                name='formGenerator'
                onFinish={(values: Record<string, unknown>) => {
                  onSubmit(values).catch((error) => {
                    console.error(`Error while executing the Form onFinish function: ${error}`)
                  })
                }}
                onFinishFailed={onFinishFailed}
                onReset={(event) => {
                  event.preventDefault()
                  setInitialValues()
                }}
                size={size}
              >
                {parseData(schema)}
              </Form>
            </div>
          </Col>

          <Col className={styles.anchorLabelWrapper} flex={'1 1 0'}>
            <Anchor
              affix={false}
              getContainer={() => document.getElementById('anchor-content') as HTMLDivElement}
              items={getAnchorList()}
              onClick={handleAnchorClick}
            />
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default FormGenerator
