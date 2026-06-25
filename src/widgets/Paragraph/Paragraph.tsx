import { Typography } from 'antd'
import Linkify from 'linkify-react'

import type { WidgetProps } from '../../types/Widget'

import { resolveLocalTokens } from './localTokens'
import styles from './Paragraph.module.css'
import type { Paragraph as WidgetType } from './Paragraph.type'

export type ParagraphWidgetData = WidgetType['spec']['widgetData']

const Paragraph = ({ uid, widgetData }: WidgetProps<ParagraphWidgetData>) => {
  const { code, copyable, delete: del, disabled, ellipsis, italic, level, mark, strong, text, type, underline, variant } = widgetData

  // Resolve client-side tokens (currently {localTimeOfDay}) in the browser so they reflect the
  // viewer's local time regardless of snowplow's cached server `now`. See ./localTokens.
  const resolvedText = resolveLocalTokens(text)

  const content = (
    <Linkify
      options={{
        rel: 'noopener noreferrer',
        target: '_blank',
      }}
    >
      {resolvedText}
    </Linkify>
  )

  // Frontend-only cosmetic hide: the page-header eyebrow ("PLATFORM · TENANT …", "CATALOG ·
  // CURATED", …) is suppressed to drop the redundant third title — the eyebrow-styled breadcrumb
  // now carries that context line above the H1. Canonical source is the chart's `*-eyebrow`
  // Paragraph CRs; returning null here avoids touching the cluster. Delete this block (restoring
  // the original `<div className=… eyebrow>{content}</div>`) to bring the eyebrows back.
  if (variant === 'eyebrow') {
    return null
  }

  // A `level` promotes the text to a Typography.Title (h1-h5); otherwise it
  // renders as a body Paragraph. Both share the same inline-style props.
  if (level) {
    return (
      <Typography.Title
        className={styles.paragraph}
        code={code}
        copyable={copyable}
        delete={del}
        disabled={disabled}
        ellipsis={ellipsis}
        italic={italic}
        key={uid}
        level={level}
        mark={mark}
        type={type}
        underline={underline}
      >
        {content}
      </Typography.Title>
    )
  }

  return (
    <Typography.Paragraph
      className={styles.paragraph}
      code={code}
      copyable={copyable}
      delete={del}
      disabled={disabled}
      ellipsis={ellipsis}
      italic={italic}
      key={uid}
      mark={mark}
      strong={strong}
      type={type}
      underline={underline}
    >
      {content}
    </Typography.Paragraph>
  )
}

export default Paragraph
