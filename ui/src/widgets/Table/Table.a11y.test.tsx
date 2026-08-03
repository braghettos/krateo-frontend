// @vitest-environment jsdom
/**
 * Accessibility regression tests for the Table widget's clickable rows.
 *
 * WCAG 2.1 SC 2.1.1 (Keyboard): a row that navigates on click must be operable by
 * keyboard alone — focusable (tabIndex), announced as an actionable control
 * (role=button), and activated by Enter/Space. Previously the row had onClick +
 * cursor:pointer only, so keyboard users could not drill in.
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

const navigateSpy = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, useNavigate: () => navigateSpy }
})
vi.mock('../../components/FiltesProvider/FiltersProvider', () => ({
  useFilter: () => ({ getFilteredData: (data: unknown) => data }),
}))

import Table from './Table'
import type { TableWidgetData } from './Table'

afterEach(() => {
  cleanup()
  navigateSpy.mockClear()
})

const widgetData = {
  columns: [{ title: 'Name', valueKey: 'name' }],
  dataSource: [
    [
      { kind: 'jsonSchemaType', stringValue: 'alpha', type: 'string', valueKey: 'name' },
      { kind: 'jsonSchemaType', stringValue: 'team-a', type: 'string', valueKey: 'ns' },
    ],
  ],
  rowNavigateTo: '/compositions/{ns}/{name}',
} as unknown as TableWidgetData

function renderTable() {
  return render(
    <MemoryRouter>
      <App>
        <Table resourcesRefs={{ items: [] }} uid='t1' widget={{} as never} widgetData={widgetData} />
      </App>
    </MemoryRouter>,
  )
}

describe('Table widget — clickable rows are keyboard-operable (WCAG 2.1.1)', () => {
  it('a navigable row exposes role=button and tabIndex=0', () => {
    const { container } = renderTable()
    const row = container.querySelector('tbody tr[role="button"]')
    expect(row).toBeTruthy()
    expect(row?.getAttribute('tabindex')).toBe('0')
  })

  it('Enter activates the row navigation', () => {
    const { container } = renderTable()
    const row = container.querySelector('tbody tr[role="button"]') as HTMLElement
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(navigateSpy).toHaveBeenCalledWith('/compositions/team-a/alpha')
  })

  it('Space activates the row navigation', () => {
    const { container } = renderTable()
    const row = container.querySelector('tbody tr[role="button"]') as HTMLElement
    fireEvent.keyDown(row, { key: ' ' })
    expect(navigateSpy).toHaveBeenCalledWith('/compositions/team-a/alpha')
  })
})
