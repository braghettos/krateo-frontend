import { defineWidget } from '../widget-module'

import List from './List'

export default defineWidget({ aliases: ['DataGrid'], component: List, kind: 'List', paginated: true })
