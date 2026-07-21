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
 *
 * previewPage v2 (FE-P4): a payload carrying `liveEndpoint` renders TWO tabs —
 * "Rendered (live)": the portal's OWN WidgetRenderer mounted on the ROOT draft's
 * REAL served widgetEndpoint (snowplow compiles the sandbox drafts exactly like a
 * production page; children resolve recursively; the render runs under the viewing
 * user's identity) — and "Source": the classic per-CR YAML view. `onClose` is the
 * teardown seam: the v2 flow best-effort-DELETEs its sandbox drafts when the drawer
 * closes (epoch-guarded upstream, so a stale close never touches a newer preview).
 */
import { Alert, Collapse, Drawer, Empty, Tabs, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import SyntaxHighlighter from 'react-syntax-highlighter'
import atomOneDark from 'react-syntax-highlighter/dist/esm/styles/hljs/atom-one-dark.js'
import lightfair from 'react-syntax-highlighter/dist/esm/styles/hljs/lightfair.js'

import { useThemeMode } from '../../context/ThemeModeContext'
import WidgetRenderer from '../WidgetRenderer'

import { useAutopilot } from './AutopilotProvider'
import { AUTOPILOT_PREVIEW_EVENT, type AutopilotPreviewPayload, type PreviewObjectEntry } from './previewBus'
import { PreviewFormSection } from './previewFormSection'
import styles from './previewSurface.module.css'

/** The open Autopilot rail's fixed width (AutopilotRail.module.css `.apRail.open`). The preview
 * drawer offsets by this so it sits LEFT of the chat instead of covering it. */
const RAIL_WIDTH = 384

const ObjectHeadline = ({ entry }: { entry: PreviewObjectEntry }) => (
  <span className={styles.headline}>
    <Tag>{entry.kind}</Tag>
    <Typography.Text strong>{entry.name ?? '(unnamed)'}</Typography.Text>
    {entry.namespace ? <Typography.Text type='secondary'>· {entry.namespace}</Typography.Text> : null}
  </span>
)

export const AutopilotPreviewDrawer = () => {
  const { mode } = useThemeMode()
  const { open: railOpen } = useAutopilot()
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

  // The unified "Files" tab: the SOURCE tree a publish commits, each file headed by its repo-relative
  // destination path. Same shape for both builders (a page's widget CRs / a blueprint's chart tree) —
  // it IS the write-set the blast-radius later confirms, shown up front.
  const filesBody = payload.files?.length ? (
    <div className={styles.body}>
      {payload.files.map((file, index) => (
        <div className={styles.file} key={`file-${index}-${file.path}`}>
          <div className={styles.filePath}><Typography.Text code>{file.path}</Typography.Text></div>
          <div className={styles.yaml}>
            <SyntaxHighlighter language='yaml' showLineNumbers style={highlighterStyle} wrapLines wrapLongLines>
              {file.content}
            </SyntaxHighlighter>
          </div>
        </div>
      ))}
    </div>
  ) : null

  // The classic source view (error / verdicts / summary / per-object YAML). With a
  // v2 `liveEndpoint` this becomes the "Source" tab next to the live render.
  const sourceBody = (
    <div className={styles.body}>
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
  )

  // The unified tab set — the same shape for BOTH builders: [Rendered (live) if a sandbox endpoint] →
  // [Files: the committed source tree with paths] → [Source: rendered output / CRs + validation].
  const tabs = [
    ...(payload.liveEndpoint
      // The REAL renderer on the REAL served endpoint: snowplow resolves the sandbox drafts
      // (templates, apiRef data, children) like any page; its own loading/error states are honest.
      ? [{ children: <div className={styles.live}><WidgetRenderer widgetEndpoint={payload.liveEndpoint} /></div>, key: 'live', label: 'Rendered (live)' }]
      : []),
    ...(filesBody ? [{ children: filesBody, key: 'files', label: 'Files' }] : []),
    { children: sourceBody, key: 'source', label: 'Source' },
  ]

  return (
    <Drawer
      destroyOnHidden
      // #3 — don't cover the chat: drop the dimming mask, and when the rail is open shift the drawer
      // left of its 384px so the preview AND the conversation stay visible + interactive at once.
      mask={false}
      onClose={() => {
        setOpen(false)
        // previewPage v2 teardown seam — fired on the ACTUAL close (epoch-guarded
        // upstream, so a payload replaced while open never double-tears-down).
        payload.onClose?.()
      }}
      open={open}
      rootStyle={railOpen ? { insetInlineEnd: RAIL_WIDTH } : undefined}
      size='large'
      title={payload.title}
    >
      <div className={styles.body}>
        {payload.caption ? <Typography.Paragraph type='secondary'>{payload.caption}</Typography.Paragraph> : null}
        {payload.publishTarget ? (
          <div className={styles.target}>
            <Tag color='geekblue'>Publishes to</Tag>
            <Typography.Text code>{payload.publishTarget.repo}</Typography.Text>
            {payload.publishTarget.base ? <Typography.Text type='secondary'>· PR into {payload.publishTarget.base}</Typography.Text> : null}
            {/* The destination is user-owned: these are DEFAULTS — a proper form asks at publish. */}
            <Typography.Text type='secondary'>· you confirm the destination at publish</Typography.Text>
          </div>
        ) : null}
        <Tabs defaultActiveKey={tabs[0]?.key} items={tabs} />
      </div>
    </Drawer>
  )
}

export default AutopilotPreviewDrawer
