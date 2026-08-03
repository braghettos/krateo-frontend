import { useEffect, useRef, useState } from 'react'

/**
 * Measures a container's content-box width via ResizeObserver. Charts
 * (@ant-design/plots) read their canvas size at first paint; with `autoFit` they
 * race the flex/grid layout and can render against a 0/transient width — which
 * lays the plot out wrong (e.g. a donut's centre ends up off-canvas). Gating the
 * chart on a measured (>0) width and passing it explicitly removes that race and
 * keeps the chart responsive to later resizes.
 */
export function useMeasuredWidth<T extends HTMLElement>(): { ref: React.RefObject<T | null>; width: number } {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) { return }
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? 0
      if (measured > 0) { setWidth((prev) => (Math.round(measured) === prev ? prev : Math.round(measured))) }
    })
    observer.observe(el)
    return () => { observer.disconnect() }
  }, [])

  return { ref, width }
}
