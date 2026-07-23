// @vitest-environment jsdom
/**
 * Accessibility regression tests for the Button widget.
 *
 * WCAG 2.1 SC 4.1.2 (Name, Role, Value): every interactive element must have an
 * accessible name. Buttons with only an icon (no visible text) have no implicit
 * name, so the widget must supply one via aria-label.
 *
 * Strategy:
 *   - icon-only (shape=circle, no label) → aria-label derived from action id
 *   - icon-only with explicit ariaLabel field → aria-label uses that value
 *   - icon + label → no aria-label needed (label text provides the accessible name)
 *   - label only (no icon) → no aria-label (label text is the accessible name)
 */

import { cleanup, render } from '@testing-library/react'
import { App } from 'antd'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ButtonWidgetData } from './Button'
import Button from './Button'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../hooks/useHandleActions', () => ({
  useHandleAction: () => ({ handleAction: vi.fn(), isActionLoading: false }),
}))

// ---------------------------------------------------------------------------
// Cleanup between tests so DOM doesn't accumulate
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseActions: ButtonWidgetData['actions'] = {
  navigate: [
    { id: 'go-home', path: '/home', type: 'navigate' },
  ],
}

function renderButton(data: Partial<ButtonWidgetData>) {
  const widgetData: ButtonWidgetData = {
    actions: baseActions,
    clickActionId: 'go-home',
    ...data,
  }

  const { container } = render(
    <MemoryRouter>
      <App>
        <Button
          resourcesRefs={{ items: [] }}
          uid='btn-test'
          widget={{} as never}
          widgetData={widgetData}
        />
      </App>
    </MemoryRouter>,
  )

  return container.querySelector('button')!
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Button widget — icon-only accessible name (WCAG 4.1.2)', () => {
  it('icon-only button gets aria-label derived from the matched action id', () => {
    const btn = renderButton({ icon: 'fa-trash', label: undefined })
    // Falls back to action id when no explicit ariaLabel is provided
    expect(btn.getAttribute('aria-label')).toBe('go-home')
  })

  it('icon-only button with explicit ariaLabel field uses that value', () => {
    const btn = renderButton({ ariaLabel: 'Delete item', icon: 'fa-trash', label: undefined })
    expect(btn.getAttribute('aria-label')).toBe('Delete item')
  })

  it('icon-only circle-shape button also gets aria-label', () => {
    const btn = renderButton({ icon: 'fa-pencil', label: undefined, shape: 'circle' })
    expect(btn.getAttribute('aria-label')).toBe('go-home')
  })

  it('button with visible label does NOT get aria-label (label text is the accessible name)', () => {
    const btn = renderButton({ icon: 'fa-rocket', label: 'Deploy' })
    // aria-label must be absent so AT reads the visible label, not a duplicate
    expect(btn.hasAttribute('aria-label')).toBe(false)
  })

  it('label-only button (no icon) does NOT get aria-label', () => {
    const btn = renderButton({ label: 'Save' })
    expect(btn.hasAttribute('aria-label')).toBe(false)
  })
})
