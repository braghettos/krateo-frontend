import { LoadingOutlined } from '@ant-design/icons'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Descriptions, Form as AntdForm, Result, Space, Spin } from 'antd'
import useApp from 'antd/es/app/useApp'
import dayjs from 'dayjs'
import type { JSONSchema4 } from 'json-schema'
import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import WidgetRenderer from '../../components/WidgetRenderer'
import { useHandleAction } from '../../hooks/useHandleActions'
import type { WidgetProps } from '../../types/Widget'
import { getEndpointUrl } from '../../utils/utils'
import { useDrawerContext } from '../Drawer/DrawerContext'

import styles from './Form.module.css'
import type { Form as WidgetType } from './Form.type'
import { SchemaFields } from './SchemaFields'
import { getDefaultsFromSchema } from './utils'

export type FormWidgetData = WidgetType['spec']['widgetData']

/**
 * Returns a shallow copy of a flat object where Dayjs values are converted to ISO
 * strings (form-control values like DatePicker are Dayjs; they must be serialized).
 */
export const convertDayjsToISOString = (values: Record<string, unknown>) => {
  const result: Record<string, unknown> = {}

  Object.entries(values).forEach(([key, value]) => {
    result[key] = dayjs.isDayjs(value) ? value.toISOString() : value
  })

  return result
}

interface FormExtraProps {
  buttonConfig?: FormWidgetData['buttonConfig']
  disabled?: boolean | undefined
  form?: string | undefined
  loading?: boolean
  // When set, a "Save draft" button is shown between Cancel and the primary; it is a
  // plain (htmlType='button') button so it does NOT trigger form validation — clicking
  // it persists the current field values as-is. Only wired for the inline (non-drawer)
  // render; the drawer omits it.
  onDraft?: (() => void | Promise<void>) | undefined
  // Overrides the primary (submit) button label — used by review-before-submit so the
  // Configure step's button reads "Review →" while the final Review-step button keeps
  // the real create label.
  submitLabel?: string | undefined
}

const FormExtra = ({ buttonConfig, disabled = false, form, loading, onDraft, submitLabel }: FormExtraProps): React.ReactNode => {
  const navigate = useNavigate()
  // When `secondary.navigateTo` is set the secondary button is a Cancel that
  // navigates (SPA) instead of resetting the form.
  const secondaryNav = buttonConfig?.secondary?.navigateTo
  return (
    <Space>
      <Button
        disabled={disabled}
        form={form}
        htmlType={secondaryNav ? 'button' : 'reset'}
        icon={buttonConfig?.secondary?.icon ? <FontAwesomeIcon icon={buttonConfig?.secondary?.icon as IconProp} /> : undefined}
        onClick={secondaryNav ? () => { void navigate(secondaryNav) } : undefined}
        type='default'
      >
        {buttonConfig?.secondary?.label || 'Reset'}
      </Button>
      {onDraft
        ? (
          <Button
            disabled={disabled}
            htmlType='button'
            icon={buttonConfig?.draft?.icon ? <FontAwesomeIcon icon={buttonConfig?.draft?.icon as IconProp} /> : undefined}
            onClick={() => { void onDraft() }}
            type='default'
          >
            {buttonConfig?.draft?.label || 'Save draft'}
          </Button>
        )
        : null}
      <Button
        form={form}
        htmlType='submit'
        icon={buttonConfig?.primary?.icon ? <FontAwesomeIcon icon={buttonConfig?.primary?.icon as IconProp} /> : undefined}
        loading={loading}
        type='primary'
      >
        {submitLabel ?? (buttonConfig?.primary?.label || 'Submit')}
      </Button>
    </Space>
  )
}

/**
 * Read-only summary shown in the in-place Review step (`reviewBeforeSubmit`). Renders the
 * validated values that WILL create the resource as an antd `Descriptions`, labelled from
 * the schema (`title` → key), name+namespace first, with the per-user draft key and empty
 * values omitted. Object/array values are JSON-shown.
 */
/** Display a reviewed value: objects/arrays as JSON, booleans as Yes/No, else as text. */
const formatReviewValue = (value: unknown): string => {
  if (typeof value === 'object') { return JSON.stringify(value) }
  if (typeof value === 'boolean') { return value ? 'Yes' : 'No' }
  if (typeof value === 'number') { return String(value) }
  if (typeof value === 'string') { return value }
  return ''
}

/** Sort key: identity (name, namespace) first, everything else after. */
const reviewFieldOrder = (key: string): number => {
  if (key === 'name') { return 0 }
  if (key === 'namespace') { return 1 }
  return 2
}

const ReviewSummary = ({ schema, values }: { schema?: JSONSchema4; values: Record<string, unknown> }): React.ReactNode => {
  const items = Object.entries(values)
    .filter(([key]) => key !== '__owner')
    .filter(([, value]) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0))
    .sort(([keyA], [keyB]) => reviewFieldOrder(keyA) - reviewFieldOrder(keyB))
    .map(([key, value]) => {
      const node = schema?.properties?.[key]
      const label = (typeof node?.title === 'string' && node.title) || key
      return { children: formatReviewValue(value), key, label }
    })

  return (
    <Descriptions
      bordered
      column={1}
      items={items}
      size='small'
      title='Review — these values will create the composition'
    />
  )
}

/**
 * Composable Form: provides the antd Form context + submit, and renders its
 * child form-control widgets (Input/Select/Switch/…) which self-bind by
 * `Form.Item` name. There is no client-side schema generator — a CR that needs
 * to build fields from a source schema does so server-side via a jq expression
 * in `widgetDataTemplate` that populates `items`.
 *
 * When `reviewBeforeSubmit` is set (inline render only), the primary button first
 * validates and reveals an in-place read-only Review of the entered values; the form
 * stays mounted (hidden) so "Back to edit" keeps every value, and the final Review-step
 * button runs the same submit action. Default (flag off) is unchanged.
 */
const Form = ({ resourcesRefs, widget, widgetData }: WidgetProps<FormWidgetData>) => {
  const { actions, buttonConfig, disabled, draftActionId, initialValues, items, layout, propertiesToHide, reviewBeforeSubmit, schema, size, submitActionId } = widgetData
  const jsonSchema = schema as JSONSchema4 | undefined
  const { insideDrawer, setDrawerData } = useDrawerContext()
  const alreadySetDrawerData = useRef(false)

  const { notification } = useApp()
  const { handleAction, isActionLoading } = useHandleAction()

  // A controlled instance so the draft handler can read the live store (incl. values
  // seeded via initialValues but not rendered, e.g. the per-user draft key) — onFinish
  // only yields validated, registered fields.
  const [form] = AntdForm.useForm()

  // In-place Review state: the validated values captured on "Review →" (null = editing).
  const [reviewValues, setReviewValues] = useState<Record<string, unknown> | null>(null)
  const reviewing = !insideDrawer && !!reviewBeforeSubmit && reviewValues !== null

  /* https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button#form */
  const formId = useId()

  useEffect(() => {
    if (insideDrawer && !alreadySetDrawerData.current) {
      setDrawerData({ extra: <FormExtra buttonConfig={buttonConfig} form={formId} loading={isActionLoading} /> })
      alreadySetDrawerData.current = true
    }
  }, [buttonConfig, formId, insideDrawer, isActionLoading, setDrawerData])

  const action = Object.values(actions)
    .flat()
    .find(({ id }) => id === submitActionId)

  const draftAction = draftActionId
    ? Object.values(actions).flat().find(({ id }) => id === draftActionId)
    : undefined

  // "Save draft" — persist the current field values WITHOUT validation. getFieldsValue(true)
  // returns the entire form store (including values seeded via initialValues that have no
  // rendered field, e.g. the per-user `__owner` draft key), unlike onFinish which only
  // delivers validated registered fields. Only offered when the CR defines draftActionId.
  const onDraft = draftAction
    ? async () => {
      if (draftAction.type !== 'rest') {
        notification.error({
          description: 'Draft action type is not "rest"',
          message: 'Error while executing the action',
          placement: 'bottomLeft',
        })

        return
      }

      const values = convertDayjsToISOString(form.getFieldsValue(true) as Record<string, unknown>)

      await handleAction(draftAction, resourcesRefs, values, widget)
    }
    : undefined

  const onSubmit = async (formValues: Record<string, unknown>) => {
    if (!action) {
      notification.error({
        description: `The widget definition does not include an action (ID: ${submitActionId})`,
        message: 'Error while executing the action',
        placement: 'bottomLeft',
      })

      return
    }

    if (action.type !== 'rest') {
      notification.error({
        description: 'Submit action type is not "rest"',
        message: 'Error while executing the action',
        placement: 'bottomLeft',
      })

      return
    }

    if (action.onEventNavigateTo) {
      setDrawerData({ extra: <FormExtra buttonConfig={buttonConfig} disabled form={formId} loading={isActionLoading} /> })
    }

    const values = convertDayjsToISOString(formValues)

    await handleAction(action, resourcesRefs, values, widget)
  }

  // On a validated submit: with review-before-submit on and still editing, capture the
  // values and switch to the in-place Review step instead of submitting. Otherwise submit.
  const onFinish = (formValues: Record<string, unknown>) => {
    if (reviewBeforeSubmit && !insideDrawer && reviewValues === null) {
      setReviewValues(convertDayjsToISOString(formValues))

      return
    }

    void onSubmit(formValues)
  }

  if (!jsonSchema?.properties && !items?.length) {
    return (
      <div className={styles.message}>
        <Result
          status='error'
          subTitle={`The Form widget has nothing to render — provide a \`schema\` (schema-driven) or \`items\` (composable form-control widgets)`}
          title='Error while rendering widget'
        />
      </div>
    )
  }

  if (isActionLoading) {
    return (
      <div className={styles.loading}>
        <Spin indicator={<LoadingOutlined />} spinning />
      </div>
    )
  }

  // If the form is inside a Drawer, buttons are already rendered in the Drawer
  const shouldRenderButtonsInsideForm = !insideDrawer

  const reviewButtons = (
    <Space>
      <Button disabled={isActionLoading} htmlType='button' onClick={() => { setReviewValues(null) }} type='default'>
        {buttonConfig?.reviewBack?.label || '← Back to edit'}
      </Button>
      <Button
        htmlType='button'
        loading={isActionLoading}
        onClick={() => { if (reviewValues) { void onSubmit(reviewValues) } }}
        type='primary'
      >
        {buttonConfig?.primary?.label || 'Create'}
      </Button>
    </Space>
  )

  const editButtons = (
    <FormExtra
      buttonConfig={buttonConfig}
      form={formId}
      loading={isActionLoading}
      onDraft={onDraft}
      submitLabel={reviewBeforeSubmit ? (buttonConfig?.review?.label || 'Review →') : undefined}
    />
  )

  let footer: React.ReactNode = null
  if (shouldRenderButtonsInsideForm) {
    footer = reviewing ? reviewButtons : editButtons
  }

  return (
    <div className={styles.form} data-inside-drawer={insideDrawer}>
      {/* Kept mounted (hidden in review) so "Back to edit" preserves every entered value. */}
      <div style={reviewing ? { display: 'none' } : undefined}>
        <AntdForm
          disabled={disabled}
          form={form}
          id={formId}
          initialValues={jsonSchema ? { ...getDefaultsFromSchema(jsonSchema), ...initialValues } : initialValues}
          layout={layout}
          onFinish={(formValues) => { onFinish(formValues as Record<string, unknown>) }}
          size={size}
        >
          {jsonSchema?.properties
            ? <SchemaFields hide={propertiesToHide} schema={jsonSchema} />
            : items?.map(({ resourceRefId }, index) => {
              const endpoint = getEndpointUrl(resourceRefId, resourcesRefs)
              return endpoint ? <WidgetRenderer key={`${formId}-${index}`} widgetEndpoint={endpoint} /> : null
            })}
        </AntdForm>
      </div>

      {reviewing && reviewValues ? <ReviewSummary schema={jsonSchema} values={reviewValues} /> : null}

      <div className={styles.extra}>{footer}</div>
    </div>
  )
}

export default Form
