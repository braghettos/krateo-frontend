import { defineWidget } from '../widget-module'

import List from './List'

// Kind is 'Listy', NOT 'List': k8s reserves the `List` kind (the meta/v1 collection
// wrapper), so `kind: List` CRs can't be created via POST/Helm/apply (the apiserver
// 404s the create) — and antd deprecated `List` in favour of `Listy`. So we adopt the
// antd-successor name `Listy` for the kind/CRD; the renderer still uses antd's `List`
// component until antd's `Listy` is GA (drop-in swap then, no kind change).
export default defineWidget({ component: List, kind: 'Listy', paginated: true })
