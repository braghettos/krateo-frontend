import { Typography } from 'antd'
import Linkify from 'linkify-react'

import type { WidgetProps } from '../../types/Widget'

import styles from './Paragraph.module.css'
import type { Paragraph as WidgetType } from './Paragraph.type'

export type ParagraphWidgetData = WidgetType['spec']['widgetData']

const Paragraph = ({ uid, widgetData }: WidgetProps<ParagraphWidgetData>) => {
  const { code, copyable, delete: del, disabled, ellipsis, italic, mark, strong, text, type, underline } = widgetData

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
      <Linkify
        options={{
          rel: 'noopener noreferrer',
          target: '_blank',
        }}
      >
        {text}
      </Linkify>
    </Typography.Paragraph>
  )
}

export default Paragraph
