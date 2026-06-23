import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Button, Tooltip } from 'antd'

import { useThemeMode } from '../../context/ThemeModeContext'

/** Header control that toggles the app between light and dark color modes. */
const ThemeToggle = () => {
  const { mode, toggle } = useThemeMode()
  const isDark = mode === 'dark'

  return (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <Button
        aria-label='Toggle color theme'
        icon={<FontAwesomeIcon icon={['fas', isDark ? 'sun' : 'moon'] as IconProp} />}
        onClick={toggle}
        shape='circle'
        type='text'
      />
    </Tooltip>
  )
}

export default ThemeToggle
