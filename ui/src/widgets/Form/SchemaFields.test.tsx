// @vitest-environment jsdom
/**
 * FRM1 — progressive disclosure in the schema→controls renderer (SchemaFields). The create
 * form partitions properties by `schema.required`: REQUIRED fields render up-front, the
 * NON-required ones are collected into an antd Collapse titled "Advanced · N settings"
 * (collapsed by default). This is disclosure, not hiding — a collapsed optional field is
 * still mounted, so it validates and submits its value exactly like a flat field. `hide`
 * still omits a property from either partition.
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Form as AntdForm } from 'antd'
import type { JSONSchema4 } from 'json-schema'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { SchemaFields } from './SchemaFields'

// No global test setup/auto-cleanup is configured (see vite.config.ts) — unmount between tests
// so accumulated DOM doesn't make document-wide queries ambiguous.
afterEach(() => { cleanup() })

beforeAll(() => {
  // antd needs these browser APIs; jsdom has neither.
  const noop = () => undefined
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({
      addEventListener: noop,
      addListener: noop,
      dispatchEvent: () => false,
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: noop,
      removeListener: noop,
    }),
    writable: true,
  })
  globalThis.ResizeObserver = class {
    disconnect = noop
    observe = noop
    unobserve = noop
  } as unknown as typeof ResizeObserver
})

// A deliberately NON-alphabetical property order (required interleaved with optional) — the
// renderer must partition by `required` while preserving each partition's original order.
/* eslint-disable sort-keys/sort-keys-fix */
const SCHEMA: JSONSchema4 = {
  properties: {
    // required, up-front
    name: { title: 'Name', type: 'string' },
    size: { title: 'Instance size', type: 'string' },
    // optional → Advanced collapse
    replicas: { title: 'Replica count', type: 'integer' },
    region: { title: 'Region', type: 'string' },
    debug: { title: 'Debug flag', type: 'boolean' },
    // hidden — must never render, in either partition
    internalToken: { title: 'Internal token', type: 'string' },
  },
  required: ['name', 'size'],
  type: 'object',
}
/* eslint-enable sort-keys/sort-keys-fix */

// Renders SchemaFields inside a real antd Form so submission / validation are exercised.
const renderInForm = (onFinish?: (values: Record<string, unknown>) => void, hide: string[] = ['internalToken']) => {
  const Harness = () => {
    const [form] = AntdForm.useForm()
    return (
      <AntdForm form={form} onFinish={(values) => onFinish?.(values as Record<string, unknown>)}>
        <SchemaFields hide={hide} schema={SCHEMA} />
        <button type='submit'>submit</button>
      </AntdForm>
    )
  }
  return render(<Harness />)
}

describe('SchemaFields — Advanced/required partition (FRM1)', () => {
  it('renders REQUIRED properties up-front, OUTSIDE the Advanced collapse', () => {
    const { container, getByText } = renderInForm()
    const collapse = container.querySelector('.ant-collapse')
    expect(collapse).toBeTruthy()
    // Required labels are present…
    expect(getByText('Name')).toBeTruthy()
    expect(getByText('Instance size')).toBeTruthy()
    // …and NOT contained within the Advanced collapse.
    expect(collapse?.contains(getByText('Name'))).toBe(false)
    expect(collapse?.contains(getByText('Instance size'))).toBe(false)
  })

  it('collects the OPTIONAL properties into the Advanced collapse with a correct count', () => {
    const { container, getByText } = renderInForm()
    const collapse = container.querySelector('.ant-collapse')
    // 3 optional props (replicas, region, debug) — internalToken is hidden, not counted.
    const header = collapse?.querySelector('.ant-collapse-header') as HTMLElement
    expect(header.textContent).toContain('Advanced · 3 settings')
    // Every optional label lives inside the collapse.
    expect(collapse?.contains(getByText('Replica count'))).toBe(true)
    expect(collapse?.contains(getByText('Region'))).toBe(true)
    expect(collapse?.contains(getByText('Debug flag'))).toBe(true)
  })

  it('is COLLAPSED by default — the Advanced panel content is not expanded', () => {
    const { container } = renderInForm()
    // No active/expanded panel item on first render.
    expect(container.querySelector('.ant-collapse-item-active')).toBeNull()
  })

  it('HIDES a hidden property from BOTH partitions', () => {
    const { queryByText } = renderInForm()
    expect(queryByText('Internal token')).toBeNull()
  })

  it('singularizes the count label for exactly one optional field', () => {
    const oneOptional: JSONSchema4 = {
      properties: {
        name: { title: 'Name', type: 'string' },
        note: { title: 'Note', type: 'string' },
      },
      required: ['name'],
      type: 'object',
    }
    const { container } = render(
      <AntdForm>
        <SchemaFields schema={oneOptional} />
      </AntdForm>,
    )
    const header = container.querySelector('.ant-collapse-header') as HTMLElement
    expect(header.textContent).toContain('Advanced · 1 setting')
    expect(header.textContent).not.toContain('settings')
  })

  it('renders NO Advanced collapse when every property is required', () => {
    const allRequired: JSONSchema4 = {
      properties: { name: { title: 'Name', type: 'string' } },
      required: ['name'],
      type: 'object',
    }
    const { container, getByText } = render(
      <AntdForm>
        <SchemaFields schema={allRequired} />
      </AntdForm>,
    )
    expect(getByText('Name')).toBeTruthy()
    expect(container.querySelector('.ant-collapse')).toBeNull()
  })

  it('a COLLAPSED optional field still SUBMITS its value (disclosure, not hiding)', async () => {
    const onFinish = vi.fn()
    const { container, getByText } = renderInForm(onFinish)
    // The collapse is closed — the optional "Region" field is mounted (forceRender) but hidden.
    expect(container.querySelector('.ant-collapse-item-active')).toBeNull()

    // Fill the required fields (so validation passes) and a COLLAPSED optional field.
    const nameInput = document.getElementById('name') as HTMLInputElement
    const sizeInput = document.getElementById('size') as HTMLInputElement
    const regionInput = document.getElementById('region') as HTMLInputElement
    // mounted despite being collapsed (forceRender)
    expect(regionInput).toBeTruthy()
    fireEvent.change(nameInput, { target: { value: 'demo' } })
    fireEvent.change(sizeInput, { target: { value: 'large' } })
    fireEvent.change(regionInput, { target: { value: 'eu-west' } })

    fireEvent.click(getByText('submit'))

    await vi.waitFor(() => {
      expect(onFinish).toHaveBeenCalledTimes(1)
    })
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ name: 'demo', region: 'eu-west', size: 'large' }))
  })
})
