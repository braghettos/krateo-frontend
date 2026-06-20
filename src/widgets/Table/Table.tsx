import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Table as AntdTable, Result, Tag, Typography } from 'antd'
import { useNavigate } from 'react-router'

import { useFilter } from '../../components/FiltesProvider/FiltersProvider'
import WidgetRenderer from '../../components/WidgetRenderer'
import type { WidgetProps } from '../../types/Widget'
import { formatISODate, formatRelativeTime, getEndpointUrl } from '../../utils/utils'

import styles from './Table.module.css'
import type { Table as WidgetType } from './Table.type'

export type TableWidgetData = WidgetType['spec']['widgetData']

const Table = ({ resourcesRefs, uid, widgetData }: WidgetProps<TableWidgetData>) => {
  const { bordered, columns, dataSource, pagination, prefix, rowNavigateTo, size } = widgetData
  const data = dataSource ?? []
  const pageSize = pagination?.pageSize ?? pagination?.defaultPageSize
  const { getFilteredData } = useFilter()
  const navigate = useNavigate()

  // Optional row → route navigation. `rowNavigateTo` is a path with `{valueKey}`
  // placeholders filled from that row's cells (e.g. "/compositions/{ns}/{name}").
  const buildRowPath = (row: NonNullable<TableWidgetData['dataSource']>[number]): string | undefined => {
    if (!rowNavigateTo) { return undefined }
    let missing = false
    const path = rowNavigateTo.replace(/\{([^}]+)\}/g, (_match, key: string) => {
      const value = row.find((cell) => cell.valueKey === key)?.stringValue
      if (value === undefined || value === '') {
        missing = true
        return ''
      }
      return encodeURIComponent(value)
    })
    return missing ? undefined : path
  }

  // TODO: check if this works with RESTAction, it should not be displayed
  if (!columns.length) {
    return (
      <Result
        status='error'
        subTitle={'It is necessary to configure columns data in order to display Table data.'}
        title={'Error while rendering widget'}
      />
    )
  }

  let dataTable: TableWidgetData['dataSource'] = data
  if (prefix && data?.length > 0) {
    dataTable = getFilteredData(data, prefix) as TableWidgetData['dataSource']
  }

  return (
    <AntdTable
      bordered={bordered}
      columns={columns?.map(({ color, title, valueKey }, index) => ({
        dataIndex: valueKey,
        key: `${uid}-col-${index}`,
        render: (_: unknown, row: NonNullable<TableWidgetData['dataSource']>[number]) => {
          const cell = row.find((cell) => cell.valueKey === valueKey)

          if (!cell) {
            console.error('Table rendering error: cell is undefined')
            return <span>-</span>
          }

          const { arrayValue, booleanValue, color: cellColor, decimalValue, format, kind, numberValue, resourceRefId, stringValue, type } = cell
          const endpoint = kind === 'widget' && resourceRefId && getEndpointUrl(resourceRefId, resourcesRefs)

          switch (kind) {
            case 'tag':
              // Per-row colored Tag (e.g. status Healthy/Failed/Pending). The color
              // rides on the cell so each row can differ — unlike the per-column color.
              return <Tag color={cellColor ?? color}>{stringValue ?? '-'}</Tag>

            case 'icon':
              if (stringValue) { return <FontAwesomeIcon color={color} icon={stringValue as IconProp} /> }
              console.error('Table rendering error: icon value has incorrect format')
              return <span>-</span>

            case 'widget':
              if (!resourceRefId) {
                console.error('Table rendering error: widget resourceRefId not found')
                return <span>-</span>
              }

              if (!endpoint) {
                console.error('Table rendering error: widget resourceRefId endpoint not found')
                return <span>-</span>
              }

              return <WidgetRenderer widgetEndpoint={endpoint} />

            case 'jsonSchemaType':
              if (!type) {
                console.error('Table rendering error: jsonSchemaType cell missing type')
                return <span>-</span>
              }

              switch (type) {
                case 'string': {
                  // Optional display format (relative age / formatted date) — the raw
                  // value stays in the data; only the rendering changes.
                  const formatted = (() => {
                    if (!stringValue) { return '-' }
                    if (format === 'relative') { return formatRelativeTime(stringValue) }
                    if (format === 'date' || format === 'datetime') { return formatISODate(stringValue, format === 'datetime') }
                    return stringValue
                  })()
                  return <span style={{ color: cellColor ?? color }}>{formatted}</span>
                }
                case 'number':
                case 'integer':
                  return <span style={{ color }}>{numberValue ?? '-'}</span>
                case 'decimal':
                  return <span style={{ color }}>{String(decimalValue) ?? '-'}</span>
                case 'boolean':
                  return <span style={{ color }}>{booleanValue !== undefined ? String(booleanValue) : '-'}</span>
                case 'array':
                  return <span style={{ color }}>{arrayValue ? arrayValue.join(', ') : '-'}</span>
                case 'null':
                  return <span>-</span>
                default:
                  console.error('Table rendering error: unknown jsonSchemaType')
                  return <span>-</span>
              }

            default:
              console.error('Table rendering error: unknown kind')
              return <span>-</span>
          }
        },
        title: (
          <div className={styles.headerEllipsis}>
            <Typography.Text ellipsis={{ tooltip: true }}>
              {title}
            </Typography.Text>
          </div>
        ),
      }))}
      dataSource={dataTable}
      key={uid}
      onRow={rowNavigateTo
        ? (row) => {
          const path = buildRowPath(row)
          return path
            ? { onClick: () => { void navigate(path) }, style: { cursor: 'pointer' } }
            : {}
        }
        : undefined}
      pagination={pagination ?? (dataTable && pageSize && dataTable.length > pageSize ? { defaultPageSize: pageSize } : false)}
      scroll={{ x: 'max-content' }}
      size={size}
    />
  )
}

export default Table
