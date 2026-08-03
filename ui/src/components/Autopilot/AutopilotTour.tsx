/**
 * Guided "guide me" spotlight tour (component 12). When the orchestrator proposes
 * a `portal-tour`, this renders antd `Tour` over the REAL on-screen UI. Each step's
 * semantic anchor (nav:<Label> / action:<Label> / text:<substring>) is resolved to
 * a live DOM element here — so the tour spotlights actual rendered controls without
 * bolting `data-autopilot-anchor` onto every widget. A missing target degrades to a
 * centered step (antd default) rather than breaking the walkthrough.
 */

import { Tour } from 'antd'
import type { TourProps } from 'antd'

import { useAutopilot } from './AutopilotProvider'

const asElement = (node: Element | undefined): HTMLElement | null =>
  (node instanceof HTMLElement ? node : null)

/** Resolve a semantic tour anchor to a live DOM element (or null → centered step). */
export const resolveAutopilotAnchor = (anchor: string): HTMLElement | null => {
  const separator = anchor.indexOf(':')
  if (separator === -1) {
    return null
  }
  const kind = anchor.slice(0, separator)
  const value = anchor.slice(separator + 1).trim()
  if (!value) {
    return null
  }

  if (kind === 'nav') {
    return asElement([...document.querySelectorAll('.ant-menu-item')]
      .find((el) => el.textContent?.trim() === value))
  }
  if (kind === 'action') {
    return asElement([...document.querySelectorAll('button')]
      .find((el) => (el.textContent ?? '').trim().includes(value)))
  }
  if (kind === 'text') {
    // Smallest visible leaf carrying the text, never inside the Autopilot rail.
    return asElement([...document.querySelectorAll('h1, h2, h3, td, th, span, a, button, label')]
      .find((el) => el.children.length === 0
        && (el.textContent ?? '').trim().includes(value)
        && !el.closest('[class*="apRail"]')))
  }
  return null
}

const AutopilotTour = () => {
  const { closeTour, tour, tourOpen } = useAutopilot()

  if (!tour) {
    return null
  }

  // antd types `target` as `() => HTMLElement`, but tolerates a null return at
  // runtime (the step renders centered, no spotlight) — which is exactly the
  // graceful degradation we want for an anchor that isn't on the current page.
  const steps = tour.steps.map((step) => ({
    description: step.description,
    target: () => resolveAutopilotAnchor(step.anchor),
    title: step.title,
  })) as TourProps['steps']

  return <Tour onClose={closeTour} open={tourOpen} steps={steps} />
}

export default AutopilotTour
