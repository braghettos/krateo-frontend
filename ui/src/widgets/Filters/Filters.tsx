import { Button, Form, Space } from 'antd'
import { useEffect } from 'react'

import { useFilter } from '../../components/FiltesProvider/FiltersProvider'
import WidgetRenderer from '../../components/WidgetRenderer'
import type { WidgetProps } from '../../types/Widget'
import { getEndpointUrl } from '../../utils/utils'
import { closeDrawer } from '../Drawer/Drawer'

import type { Filters as WidgetType } from './Filters.type'

export type FiltersWidgetData = WidgetType['spec']['widgetData']

/**
 * Filters composes form-control widgets (Input/Select/Switch/DatePicker/…) as
 * filter fields: it provides the antd Form context, and on Apply collects each
 * control's value (bound by its `name`, which is the dotted data path) and pushes
 * it to the FiltersProvider for `prefix`. The match strategy per field is inferred
 * from the value type — no field-type metadata is declared here.
 */
const Filters = ({ resourcesRefs, widgetData }: WidgetProps<FiltersWidgetData>) => {
  const { items, prefix } = widgetData
  const { clearFilters, getFilters, setFilters } = useFilter()

  const [filterForm] = Form.useForm()

  const onReset = () => {
    filterForm.resetFields()
    clearFilters(prefix)
    closeDrawer()
  }

  const onSubmit = (values: Record<string, unknown>) => {
    setFilters(
      prefix,
      Object.entries(values).map(([fieldName, fieldValue]) => ({
        fieldName: fieldName.split('.'),
        fieldValue,
      }))
    )
    closeDrawer()
  }

  useEffect(() => {
    const filters = getFilters(prefix)
    if (filters) {
      filters.forEach(({ fieldName, fieldValue }) => filterForm.setFieldValue(fieldName.join('.'), fieldValue))
    }
  }, [filterForm, getFilters, prefix])

  return (
    <>
      <Form autoComplete='off' form={filterForm} layout='vertical' name='filterForm' onFinish={onSubmit}>
        {items.map(({ resourceRefId }, index) => {
          const endpoint = getEndpointUrl(resourceRefId, resourcesRefs)
          return endpoint ? <WidgetRenderer key={`filter-${index}`} widgetEndpoint={endpoint} /> : null
        })}
      </Form>
      <Space>
        <Button onClick={onReset} type='default'>Reset</Button>
        <Button onClick={() => filterForm.submit()} type='primary'>Apply</Button>
      </Space>
    </>
  )
}

export default Filters
