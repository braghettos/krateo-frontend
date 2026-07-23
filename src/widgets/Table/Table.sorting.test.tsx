// @vitest-environment jsdom
/**
 * Table widget — inferred client-side sorting (UX audit #13).
 *
 * Render-level pins: every column header gets antd sorter controls
 * automatically; numeric/age columns are right-aligned; the initial order is
 * EXACTLY the server's order (no default sortOrder); a header click sorts by
 * the RAW dataSource values (numeric compare — not the lexicographic order a
 * naive string sort would give) and the antd cycle (asc → desc → off) restores
 * the server order at the end.
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import { App } from 'antd'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

// jsdom lacks these browser APIs that antd's Table (resize/virtual, responsive) touches.
vi.stubGlobal('ResizeObserver', class {
  disconnect = vi.fn()
  observe = vi.fn()
  unobserve = vi.fn()
})
vi.stubGlobal('matchMedia', (query: string) => ({
  addEventListener: vi.fn(),
  addListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
  matches: false,
  media: query,
  onchange: null,
  removeEventListener: vi.fn(),
  removeListener: vi.fn(),
}))

vi.mock('../../components/FiltesProvider/FiltersProvider', () => ({
  useFilter: () => ({ getFilteredData: (data: unknown) => data }),
}))

import Table from './Table'
import type { TableWidgetData } from './Table'

afterEach(() => {
  cleanup()
})

// Server order: alpha, beta, gamma. Replicas 10/2/9 (lexicographic would sort
// "10" < "2" < "9"); ages 8h/2d/30m (lexicographic would sort 2d < 30m < 8h).
const widgetData = {
  columns: [
    { title: 'Name', valueKey: 'name' },
    { title: 'Replicas', valueKey: 'replicas' },
    { title: 'Age', valueKey: 'age' },
  ],
  dataSource: [
    [
      { kind: 'jsonSchemaType', stringValue: 'alpha', type: 'string', valueKey: 'name' },
      { kind: 'jsonSchemaType', numberValue: 10, type: 'number', valueKey: 'replicas' },
      { kind: 'jsonSchemaType', stringValue: '8h', type: 'string', valueKey: 'age' },
    ],
    [
      { kind: 'jsonSchemaType', stringValue: 'beta', type: 'string', valueKey: 'name' },
      { kind: 'jsonSchemaType', numberValue: 2, type: 'number', valueKey: 'replicas' },
      { kind: 'jsonSchemaType', stringValue: '2d', type: 'string', valueKey: 'age' },
    ],
    [
      { kind: 'jsonSchemaType', stringValue: 'gamma', type: 'string', valueKey: 'name' },
      { kind: 'jsonSchemaType', numberValue: 9, type: 'number', valueKey: 'replicas' },
      { kind: 'jsonSchemaType', stringValue: '30m', type: 'string', valueKey: 'age' },
    ],
  ],
} as unknown as TableWidgetData

function renderTable() {
  return render(
    <MemoryRouter>
      <App>
        <Table resourcesRefs={{ items: [] }} uid='t-sort' widget={{} as never} widgetData={widgetData} />
      </App>
    </MemoryRouter>,
  )
}

const rowNames = (container: HTMLElement): (string | null)[] => (
  Array.from(container.querySelectorAll('tbody tr.ant-table-row td:first-child')).map((cell) => cell.textContent)
)

const headers = (container: HTMLElement): HTMLElement[] => Array.from(container.querySelectorAll('thead th'))

describe('Table widget — every column gets an automatic sorter', () => {
  it('all column headers render antd sorter controls', () => {
    const { container } = renderTable()
    for (const th of headers(container)) {
      expect(th.classList.contains('ant-table-column-has-sorters')).toBe(true)
    }
  })

  it('numeric and age columns are right-aligned; string columns are not', () => {
    const { container } = renderTable()
    const cells = Array.from(container.querySelectorAll('tbody tr.ant-table-row')[0].querySelectorAll('td'))
    expect(cells[0].style.textAlign).not.toBe('right')
    expect(cells[1].style.textAlign).toBe('right')
    expect(cells[2].style.textAlign).toBe('right')
  })

  it('renders in the server order with NO default sortOrder', () => {
    const { container } = renderTable()
    expect(rowNames(container)).toEqual(['alpha', 'beta', 'gamma'])
    for (const th of headers(container)) {
      expect(th.getAttribute('aria-sort')).toBeNull()
    }
  })

  it('clicking the numeric header sorts by RAW numbers (asc → desc → back to server order)', () => {
    const { container } = renderTable()
    const [, replicasHeader] = headers(container)
    fireEvent.click(replicasHeader)
    // 2 < 9 < 10 — lexicographic on rendered text would give 10, 2, 9
    expect(rowNames(container)).toEqual(['beta', 'gamma', 'alpha'])
    expect(replicasHeader.getAttribute('aria-sort')).toBe('ascending')
    fireEvent.click(replicasHeader)
    expect(rowNames(container)).toEqual(['alpha', 'gamma', 'beta'])
    expect(replicasHeader.getAttribute('aria-sort')).toBe('descending')
    fireEvent.click(replicasHeader)
    expect(rowNames(container)).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('clicking the age header sorts by parsed age seconds, not string order', () => {
    const { container } = renderTable()
    fireEvent.click(headers(container)[2])
    // 30m < 8h < 2d — lexicographic would give 2d, 30m, 8h
    expect(rowNames(container)).toEqual(['gamma', 'alpha', 'beta'])
  })
})
