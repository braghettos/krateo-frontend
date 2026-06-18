import { Typography } from 'antd'
import Linkify from 'linkify-react'

import type { WidgetProps } from '../../types/Widget'

import styles from './Paragraph.module.css'
import type { Paragraph as WidgetType } from './Paragraph.type'

export type ParagraphWidgetData = WidgetType['spec']['widgetData']

const Paragraph = ({ uid, widgetData }: WidgetProps<ParagraphWidgetData>) => {
  const { code, copyable, delete: del, disabled, ellipsis, italic, level, mark, strong, text, type, underline } = widgetData

  const content = (
    <Linkify
      options={{
        rel: 'noopener noreferrer',
        target: '_blank',
      }}
    >
      {text}
    </Linkify>
  )

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
