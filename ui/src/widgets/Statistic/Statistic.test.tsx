// @vitest-environment jsdom
/**
 * §6 (audit): a Statistic must distinguish a GENUINE computed value (including 0) from
 * data-missing. A null/undefined/empty value renders a muted em-dash; a real 0 renders "0".
 */

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import Statistic from './Statistic'
import type { StatisticWidgetData } from './Statistic'

afterEach(cleanup)

function renderStat(data: Partial<StatisticWidgetData>) {
  const { container } = render(
    <Statistic
      resourcesRefs={{ items: [] }}
      uid='s'
      widget={{} as never}
      widgetData={{ ...data } as StatisticWidgetData}
    />,
  )
  return container.querySelector('.ant-statistic-content') as HTMLElement
}

describe('Statistic widget — genuine 0 vs data-missing (audit §6)', () => {
  it('a genuine 0 renders as "0" (not a missing marker)', () => {
    const el = renderStat({ value: 0 })
    expect(el.textContent).toContain('0')
    expect(el.textContent).not.toContain('—')
  })

  it('an empty value renders the muted em-dash', () => {
    const el = renderStat({ value: '' })
    expect(el.textContent).toContain('—')
  })

  it('a real numeric value renders normally', () => {
    const el = renderStat({ value: 42 })
    expect(el.textContent).toContain('42')
  })
})
