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
        // #80 §0.10: `fa-sun` at 16px read as a gear/cog — use the conventional half-stroke
        // "contrast" glyph (an unambiguous theme toggle); the tooltip conveys the direction.
        // #80 §0.7: fixed 36×36 so it shares a centerline with the search trigger + bell.
        icon={<FontAwesomeIcon icon={['fas', 'circle-half-stroke'] as IconProp} style={{ fontSize: 16 }} />}
        onClick={toggle}
        shape='circle'
        style={{ height: 36, width: 36 }}
        type='text'
      />
    </Tooltip>
  )
}

export default ThemeToggle
