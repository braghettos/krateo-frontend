import { lazy } from 'react'

import { defineWidget } from '../widget-module'

// Lazy: code-splits the @ant-design/plots (G2) bundle; loaded on first render.
const PieChart = lazy(() => import('./PieChart'))

export default defineWidget({ component: PieChart, kind: 'PieChart' })
