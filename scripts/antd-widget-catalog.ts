import type { WidgetSpec } from './widget-codegen'

/**
 * Declarative catalog mapping Ant Design components → Krateo widgets.
 *
 * Inclusion rule (server-driven model): a component qualifies when its inputs
 * are JSON-serializable display props. Each prop name here matches the antd
 * prop name 1:1, so the generated component is a typed pass-through.
 *
 * OUT OF SCOPE (do NOT add here) — these need bespoke handling, not codegen:
 *   - Imperative / portal APIs: message, notification, Modal.method
 *   - Already custom widgets: Form, Modal, Drawer, Tabs (=TabList)
 *   - Event-driven / non-serializable / rich-children: Upload (hand-authored),
 *     Mentions, Transfer, free-form AutoComplete, Cascader
 *   - Components whose primary content is arbitrary ReactNode children that map
 *     to child widgets (e.g. Timeline item content) belong to a future
 *     resourcesRefs-aware generator, not this pass-through one.
 */
export const antdWidgetCatalog: WidgetSpec[] = [
  {
    childrenProp: 'label',
    component: 'Tag',
    description: 'Tag displays a small categorical label',
    examples: [
      { comment: 'Basic tag', name: 'example-tag-basic', widgetData: { label: 'stable' } },
      { comment: 'Colored tag', name: 'example-tag-color', widgetData: { color: 'green', label: 'production' } },
    ],
    kind: 'Tag',
    props: [
      { name: 'label', required: true, schema: { description: 'the tag text', type: 'string' } },
      { name: 'color', schema: { description: 'the tag color (preset name or hex)', type: 'string' } },
      { name: 'bordered', schema: { description: 'whether the tag has a border', type: 'boolean' } },
    ],
  },
  {
    component: 'Badge',
    description: 'Badge shows a small count or status dot',
    examples: [
      { comment: 'Count badge', name: 'example-badge-count', widgetData: { count: 5 } },
      { comment: 'Status badge', name: 'example-badge-status', widgetData: { status: 'success', text: 'Running' } },
    ],
    kind: 'Badge',
    props: [
      { name: 'count', schema: { description: 'the number shown in the badge', type: 'integer' } },
      { name: 'text', schema: { description: 'the text shown next to a status dot', type: 'string' } },
      { name: 'status', schema: { description: 'the status style', enum: ['success', 'processing', 'default', 'error', 'warning'], type: 'string' } },
      { name: 'showZero', schema: { description: 'whether to show the badge when count is zero', type: 'boolean' } },
      { name: 'dot', schema: { description: 'render a dot instead of a count', type: 'boolean' } },
    ],
  },
  {
    component: 'Alert',
    description: 'Alert displays an inline contextual message',
    examples: [
      { comment: 'Info alert with icon', name: 'example-alert-info', widgetData: { description: 'Your composition is being reconciled.', message: 'Heads up', showIcon: true, type: 'info' } },
      { comment: 'Error banner', name: 'example-alert-error', widgetData: { banner: true, message: 'Reconciliation failed', type: 'error' } },
    ],
    kind: 'Alert',
    props: [
      { name: 'message', required: true, schema: { description: 'the alert title', type: 'string' } },
      { name: 'description', schema: { description: 'the alert detail text', type: 'string' } },
      { name: 'type', schema: { description: 'the alert severity', enum: ['success', 'info', 'warning', 'error'], type: 'string' } },
      { name: 'showIcon', schema: { description: 'whether to show the severity icon', type: 'boolean' } },
      { name: 'banner', schema: { description: 'render as a full-width banner', type: 'boolean' } },
      { name: 'closable', schema: { description: 'whether the alert can be dismissed', type: 'boolean' } },
    ],
  },
  {
    component: 'Statistic',
    description: 'Statistic highlights a single numeric value',
    examples: [
      { comment: 'Basic statistic', name: 'example-statistic-basic', widgetData: { title: 'Active compositions', value: 42 } },
      { comment: 'Statistic with suffix', name: 'example-statistic-suffix', widgetData: { precision: 1, suffix: '%', title: 'Uptime', value: 99.9 } },
    ],
    kind: 'Statistic',
    props: [
      { name: 'title', schema: { description: 'the statistic label', type: 'string' } },
      { name: 'value', required: true, schema: { description: 'the statistic value', type: ['integer', 'string'] } },
      { name: 'precision', schema: { description: 'the number of decimal places', type: 'integer' } },
      { name: 'prefix', schema: { description: 'text shown before the value', type: 'string' } },
      { name: 'suffix', schema: { description: 'text shown after the value', type: 'string' } },
    ],
  },
  {
    childrenProp: 'label',
    component: 'Divider',
    description: 'Divider separates content with a horizontal rule and optional label',
    examples: [
      { comment: 'Plain divider', name: 'example-divider-plain', widgetData: {} },
      { comment: 'Divider with a label', name: 'example-divider-label', widgetData: { label: 'Details', orientation: 'left', plain: true } },
    ],
    kind: 'Divider',
    props: [
      { name: 'label', schema: { description: 'optional text shown on the divider', type: 'string' } },
      { name: 'orientation', schema: { description: 'where the label sits', enum: ['left', 'right', 'center'], type: 'string' } },
      { name: 'dashed', schema: { description: 'render a dashed line', type: 'boolean' } },
      { name: 'plain', schema: { description: 'render the label in a plain (non-bold) style', type: 'boolean' } },
    ],
  },
  {
    component: 'Result',
    description: 'Result shows the outcome of an operation with a status icon',
    examples: [
      { comment: 'Success result', name: 'example-result-success', widgetData: { status: 'success', subTitle: 'Your resources are being provisioned.', title: 'Composition created' } },
      { comment: 'Error result', name: 'example-result-error', widgetData: { status: 'error', subTitle: 'Check the form and try again.', title: 'Submission failed' } },
    ],
    kind: 'Result',
    props: [
      { name: 'status', schema: { description: 'the result status', enum: ['success', 'error', 'info', 'warning'], type: 'string' } },
      { name: 'title', schema: { description: 'the result title', type: 'string' } },
      { name: 'subTitle', schema: { description: 'the result detail text', type: 'string' } },
    ],
  },
  {
    component: 'QRCode',
    description: 'QRCode renders a scannable QR code for a value',
    examples: [
      { comment: 'Basic QR code', name: 'example-qrcode-basic', widgetData: { value: 'https://krateo.io' } },
      { comment: 'Sized QR code', name: 'example-qrcode-sized', widgetData: { size: 200, value: 'https://krateo.io' } },
    ],
    kind: 'QRCode',
    props: [
      { name: 'value', required: true, schema: { description: 'the encoded value', type: 'string' } },
      { name: 'size', schema: { description: 'the size in pixels', type: 'integer' } },
      { name: 'bordered', schema: { description: 'whether to draw a border', type: 'boolean' } },
    ],
  },
]
