import { SearchOutlined } from '@ant-design/icons'
import { Input, Modal } from 'antd'
import type { InputRef } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import styles from './CommandPalette.module.css'

// ⌘ on Mac, Ctrl elsewhere — for the visible hint only; the handler accepts both.
const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent)
const shortcutHint = isMac ? '⌘K' : 'Ctrl K'

/**
 * Global search as a ⌘K command palette. The header shows a compact trigger;
 * ⌘K (Ctrl+K off-Mac) or a click opens an overlay with an autofocused input.
 * Submitting routes to the data-driven `/search?q=…` page — the same
 * `global-search` RESTAction path the inline field used — so this is pure shell
 * chrome with no backend change. Lives in the engine (client state), not as a
 * widget, like the rest of HeaderChrome.
 */
const CommandPalette = () => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const inputRef = useRef<InputRef>(null)

  // Global ⌘K / Ctrl+K toggles the palette from anywhere; preventDefault stops
  // the browser's own address-bar quick-search binding from stealing the combo.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const close = () => {
    setOpen(false)
    setTerm('')
  }

  const submit = () => {
    const query = term.trim()
    if (query) { void navigate(`/search?q=${encodeURIComponent(query)}`) }
    close()
  }

  return (
    <>
      <button aria-label={`Search (${shortcutHint})`} className={styles.trigger} onClick={() => setOpen(true)} type='button'>
        <SearchOutlined className={styles.triggerIcon}/>
        <span className={styles.triggerLabel}>Search resources, blueprints…</span>
        <kbd className={styles.kbd}>{shortcutHint}</kbd>
      </button>

      <Modal
        afterOpenChange={(isOpen) => { if (isOpen) { inputRef.current?.focus() } }}
        className={styles.modal}
        closable={false}
        footer={null}
        onCancel={close}
        open={open}
        width={560}
      >
        <Input
          allowClear
          onChange={(event) => setTerm(event.target.value)}
          onPressEnter={submit}
          placeholder='Search resources, blueprints…'
          prefix={<SearchOutlined className={styles.modalIcon}/>}
          ref={inputRef}
          size='large'
          value={term}
        />
        <div className={styles.hintRow}>
          <span><kbd className={styles.kbdInline}>Enter</kbd> to search</span>
          <span><kbd className={styles.kbdInline}>Esc</kbd> to close</span>
        </div>
      </Modal>
    </>
  )
}

export default CommandPalette
