import { lazy } from 'react'

import { defineWidget } from '../widget-module'

// Lazy: code-splits the @ant-design/plots (G2) bundle; loaded on first render.
const BarChart = lazy(() => import('./BarChart'))

export default defineWidget({ component: BarChart, kind: 'BarChart' })
