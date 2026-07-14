/**
 * The Autopilot preview drawer — the ONE surface the Wave-4 read-only preview verbs
 * (previewBlueprint / previewPage / previewRestDef) render into. Mounted once by
 * AutopilotProvider and opened via the previewBus CustomEvent, mirroring the portal's
 * global Drawer overlay pattern (widgets/Drawer). Read-only by construction: it renders
 * the payload it was handed — no dispatcher, no fetch, no write path of any kind.
 *
 * Surface anatomy (minimal + clean, per the Wave-4 ticket): a Drawer titled by the
 * verb; an optional caption qualifying WHAT kind of preview this is (e.g. source
 * preview); a render error shown AS content when present (a bad chart is data); the
 * summary lines (RestDefinition verbs/paths); then one collapsible panel per object —
 * kind/name/namespace headline, YAML body (same highlighter setup as YamlViewer).
 */
import { Alert, Collapse, Drawer, Empty, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import atomOneDark from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark.js'
import lightfair from 'react-syntax-highlighter/dist/esm/styles/hljs/lightfair.js'

import { useThemeMode } from '../../context/ThemeModeContext'

import { AUTOPILOT_PREVIEW_EVENT, type AutopilotPreviewPayload, type PreviewObjectEntry } from './previewBus'
import { PreviewFormSection } from './previewFormSection'
import styles from './previewSurface.module.css'

const ObjectHeadline = ({ entry }: { entry: PreviewObjectEntry }) => (
  <span className={styles.headline}>
    <Tag>{entry.kind}</Tag>
    <Typography.Text strong>{entry.name ?? '(unnamed)'}</Typography.Text>
    {entry.namespace ? <Typography.Text type='secondary'>· {entry.namespace}</Typography.Text> : null}
  </span>
)

export const AutopilotPreviewDrawer = () => {
  const { mode } = useThemeMode()
  const [open, setOpen] = useState(false)
  const [payload, setPayload] = useState<AutopilotPreviewPayload | null>(null)

  useEffect(() => {
    const handleOpen = (event: CustomEvent<AutopilotPreviewPayload>) => {
      setPayload(event.detail)
      setOpen(true)
    }
    window.addEventListener(AUTOPILOT_PREVIEW_EVENT, handleOpen as EventListener)
    return () => window.removeEventListener(AUTOPILOT_PREVIEW_EVENT, handleOpen as EventListener)
  }, [])

  if (!payload) {
    return null
  }

  const highlighterStyle = (mode === 'dark' ? atomOneDark : lightfair) as { [key: string]: React.CSSProperties }
  const items = (payload.objects ?? []).map((entry, index) => ({
    children: (
      <div className={styles.yaml}>
        <SyntaxHighlighter language='yaml' showLineNumbers style={highlighterStyle} wrapLines wrapLongLines>
          {entry.yaml}
        </SyntaxHighlighter>
      </div>
    ),
    key: `${index}-${entry.kind}-${entry.name ?? 'unnamed'}`,
    label: <ObjectHeadline entry={entry} />,
  }))

  return (
    <Drawer
      destroyOnHidden
      onClose={() => setOpen(false)}
      open={open}
      size='large'
      title={payload.title}
    >
      <div className={styles.body}>
        {payload.caption ? <Typography.Paragraph type='secondary'>{payload.caption}</Typography.Paragraph> : null}
        {payload.error ? (
          <Alert
            description={<pre className={styles.errorText}>{payload.error}</pre>}
            message='Render failed'
            showIcon
            type='error'
          />
        ) : null}
        {/* FE-K1: client-side validation of the previewed draft (vs the live CRD shape)
            and the CEL-immutability warnings — the decide-before-publish surface. */}
        {payload.problems?.length ? (
          <Alert
            description={<ul className={styles.issueList}>{payload.problems.map((line, index) => <li key={`problem-${index}`}>{line}</li>)}</ul>}
            message='Validation errors — publishing this draft would be rejected'
            showIcon
            type='error'
          />
        ) : null}
        {payload.warnings?.length ? (
          <Alert
            description={<ul className={styles.issueList}>{payload.warnings.map((line, index) => <li key={`warning-${index}`}>{line}</li>)}</ul>}
            message='Immutable after generation'
            showIcon
            type='warning'
          />
        ) : null}
        {payload.summary?.length ? (
          <ul className={styles.summary}>
            {payload.summary.map((line, index) => (
              <li key={`${index}-${line}`}>
                <Typography.Text code>{line}</Typography.Text>
              </li>
            ))}
          </ul>
        ) : null}
        {items.length ? <Collapse items={items} /> : null}
        {/* FE-B1: the create-form half of a blueprint preview — the draft's
            values.schema.json mounted read-only through the production SchemaForm. */}
        {payload.formSchema ? <PreviewFormSection formSchema={payload.formSchema} /> : null}
        {!items.length && !payload.error && !payload.summary?.length && !payload.formSchema && !payload.problems?.length
          ? <Empty description='Nothing to preview' image={Empty.PRESENTED_IMAGE_SIMPLE} />
          : null}
      </div>
    </Drawer>
  )
}

export default AutopilotPreviewDrawer
