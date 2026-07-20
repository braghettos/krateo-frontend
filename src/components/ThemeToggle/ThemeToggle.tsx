import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'

import { useThemeMode } from '../../context/ThemeModeContext'

/** Header control that toggles the app between light and dark color modes. */
const ThemeToggle = () => {
  const { t } = useTranslation()
  const { mode, toggle } = useThemeMode()
  const isDark = mode === 'dark'

  return (
    <Tooltip title={isDark ? t('chrome.theme.toLight') : t('chrome.theme.toDark')}>
      <Button
        aria-label={t('chrome.theme.toggleAria')}
        icon={<FontAwesomeIcon icon={['fas', isDark ? 'sun' : 'moon'] as IconProp} style={{ fontSize: 16 }} />}
        onClick={toggle}
        shape='circle'
        type='text'
      />
    </Tooltip>
  )
}

export default ThemeToggle
