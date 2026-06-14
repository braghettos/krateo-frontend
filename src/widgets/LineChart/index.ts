import { lazy } from 'react'

import { defineWidget } from '../widget-module'

// Lazy: the heavy @ant-design/plots (G2) bundle is code-split and loaded only
// when a LineChart actually renders (WidgetRenderer provides the Suspense boundary).
const LineChart = lazy(() => import('./LineChart'))

export default defineWidget({ component: LineChart, kind: 'LineChart' })
