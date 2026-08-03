import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Avatar, Flex, Space, Typography } from 'antd'
import type { ReactNode } from 'react'

import { getColorCode } from '../../theme/palette'

import styles from './RichRow.module.css'

interface RichRowProps {
  color: string
  icon: string
  primaryText: ReactNode
  secondaryText: ReactNode
  subPrimaryText: ReactNode
  subSecondaryText: ReactNode
}

const RichRow = ({
  color,
  icon,
  primaryText,
  secondaryText,
  subPrimaryText,
  subSecondaryText,
}: RichRowProps) => {
  return (
    <Flex className={styles.richRow} gap={10} justify='space-between'>
      <Space align='center' className={styles.primary} size='large'>
        <Avatar
          icon={<FontAwesomeIcon icon={icon as IconProp} />}
          size={icon ? 24 : 18}
          style={{ backgroundColor: getColorCode(color) }} />
        <div>
          <Typography.Text className={styles.subtext}>{subPrimaryText}</Typography.Text>
          <Typography.Paragraph>{primaryText}</Typography.Paragraph>
        </div>
      </Space>
      <div className={styles.secondary}>
        <Typography.Text className={styles.subtext}>{subSecondaryText}</Typography.Text>
        <Typography.Paragraph>{secondaryText}</Typography.Paragraph>
      </div>
    </Flex>
  )
}

export default RichRow
