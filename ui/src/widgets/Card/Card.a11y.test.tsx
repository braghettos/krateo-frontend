// @vitest-environment jsdom
/**
 * Accessibility regression tests for the Card widget's clickable behaviour.
 *
 * WCAG 2.1 SC 2.1.1 (Keyboard): a Card that runs an action on click (clickActionId set)
 * must be keyboard-operable — focusable, role=button, activated by Enter/Space. A
 * non-interactive Card (no clickActionId) must stay a plain, non-focusable container.
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import { App } from 'antd'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

const handleActionSpy = vi.fn()
vi.mock('../../hooks/useHandleActions', () => ({
  useHandleAction: () => ({ handleAction: handleActionSpy, isActionLoading: false }),
}))

import Card from './Card'
import type { CardWidgetData } from './Card'

afterEach(() => {
  cleanup()
  handleActionSpy.mockClear()
})

function renderCard(data: Partial<CardWidgetData>) {
  const widgetData = { footer: [], items: [], legend: [], tags: [], title: 'Tile', ...data } as unknown as CardWidgetData
  const { container } = render(
    <MemoryRouter>
      <App>
        <Card resourcesRefs={{ items: [] }} uid='c1' widget={{} as never} widgetData={widgetData} />
      </App>
    </MemoryRouter>,
  )
  return container.querySelector('.ant-card') as HTMLElement
}

const clickable: Partial<CardWidgetData> = {
  clickActionId: 'open',
  widgetActions: { rest: [{ id: 'open', resourceRefId: 'r', type: 'rest' }] },
} as unknown as Partial<CardWidgetData>

describe('Card widget — clickable cards are keyboard-operable (WCAG 2.1.1)', () => {
  it('a clickable card exposes role=button and tabIndex=0', () => {
    const card = renderCard(clickable)
    expect(card.getAttribute('role')).toBe('button')
    expect(card.getAttribute('tabindex')).toBe('0')
  })

  it('Enter runs the click action', () => {
    const card = renderCard(clickable)
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(handleActionSpy).toHaveBeenCalledTimes(1)
  })

  it('a non-interactive card (no clickActionId) is not focusable and has no button role', () => {
    const card = renderCard({})
    expect(card.hasAttribute('role')).toBe(false)
    expect(card.hasAttribute('tabindex')).toBe(false)
  })
})
