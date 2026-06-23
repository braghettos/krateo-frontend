/** Header entry point for the Autopilot rail. Renders only when Autopilot is
 * enabled (endpoint configured / dev echo). Sits in HeaderChrome's right slot. */

import { useAutopilot } from './AutopilotProvider'
import styles from './AutopilotToggle.module.css'
import { SparkIcon } from './icons'

const AutopilotToggle = () => {
  const { enabled, open, toggle } = useAutopilot()

  if (!enabled) {
    return null
  }

  return (
    <button
      aria-pressed={open}
      className={`${styles.apToggle} ${open ? styles.active : ''}`}
      onClick={toggle}
      type='button'
    >
      <SparkIcon size={13} />
      Autopilot
    </button>
  )
}

export default AutopilotToggle
