/**
 * The docked Autopilot rail (component 1/3/7/8/10/11). Read-only Q&A MVP:
 *   head    — spark+title, live/idle pill, new-thread, collapse
 *   body    — context strip (what it SEES), transcript, per-turn suggestions
 *   composer— textarea + send + the drive-via-real-controls trust note
 *
 * Renders nothing unless Autopilot is `enabled`. The width animates 0 → 384 so the
 * shell reflows (it never overlays). All driving/HITL surfaces are Phase 2/3.
 */

import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { useAutopilot } from './AutopilotProvider'
import styles from './AutopilotRail.module.css'
import { CheckIcon, CollapseIcon, EyeIcon, LinkIcon, PlusIcon, SendIcon, SparkIcon } from './icons'
import type { AutopilotMessage } from './types'

/** Minimal inline renderer: turns `code` spans into styled chips. No HTML injection. */
const renderInline = (text: string): React.ReactNode => {
  const segments = text.split('`')
  return segments.map((segment, index) => (
    index % 2 === 1
      ? <code key={`c-${index}`}>{segment}</code>
      : <span key={`t-${index}`}>{segment}</span>
  ))
}

const MessageBubble = ({ message }: { message: AutopilotMessage }) => {
  if (message.role === 'user') {
    return <div className={`${styles.apMsg} ${styles.apMsgUser}`}>{message.text}</div>
  }
  return (
    <div className={`${styles.apMsg} ${styles.apMsgBot}`}>
      {renderInline(message.text)}
      {message.streaming ? <span className={styles.apCaret} /> : null}
      {message.actions?.map((action, index) => (
        <div className={styles.apAct} key={`act-${index}`}>
          <CheckIcon className={styles.apActCheck} />
          <span>{action.label}</span>
          {action.readOnly ? <span className={styles.apActRo}>read-only</span> : null}
        </div>
      ))}
    </div>
  )
}

const AutopilotRail = () => {
  const { collect, enabled, messages, newThread, open, send, setOpen, streaming } = useAutopilot()
  const [draft, setDraft] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)

  if (!enabled) {
    return null
  }

  // Live page-context snapshot for the "seeing …" strip (real cache, not memory).
  // Cheap (a synchronous map over the widget cache); recomputed each render so it
  // tracks navigation and new turns without a stale memo.
  const context = open ? collect() : null

  const submit = () => {
    const text = draft.trim()
    if (!text || streaming) {
      return
    }
    send(text)
    setDraft('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  const ctxStatus = context?.extras?.status
  const lastSuggestions = messages.length ? messages[messages.length - 1].suggestions : undefined

  return (
    <aside className={`${styles.apRail} ${open ? styles.open : ''}`}>
      <div className={styles.apRailInner}>
        <div className={styles.apHead}>
          <span className={styles.apTitle}><SparkIcon className={styles.apSpark} />Autopilot</span>
          <span className={`${styles.apLive} ${streaming ? '' : styles.idle}`}>
            <span className={styles.apLiveDot} />{streaming ? 'streaming' : 'live'}
          </span>
          <span className={styles.apSpacer} />
          <button aria-label='New thread' className={styles.apIc} onClick={newThread} title='New thread' type='button'>
            <PlusIcon />
          </button>
          <button aria-label='Collapse rail' className={styles.apIc} onClick={() => setOpen(false)} title='Collapse rail' type='button'>
            <CollapseIcon />
          </button>
        </div>

        <div className={styles.apBody} ref={bodyRef}>
          {context ? (
            <div className={styles.apCtx}>
              <EyeIcon className={styles.apCtxIcon} />
              seeing&nbsp;·&nbsp;<b>{context.focus}</b>&nbsp;· {context.widgets.length} widgets
              {ctxStatus ? <>&nbsp;· {ctxStatus}</> : null}
              {context.identity?.username ? <>&nbsp;· {context.identity.username}</> : null}
            </div>
          ) : null}

          {messages.length === 0 ? (
            <div className={styles.apEmpty}>
              <div className={styles.apEmptyTitle}>Ask Autopilot</div>
              It can see what&apos;s on your screen and answer questions about your
              compositions, blueprints, and platform — grounded on the live page.
            </div>
          ) : (
            messages.map((message) => <MessageBubble key={message.id} message={message} />)
          )}

          {lastSuggestions?.length ? (
            <div className={styles.apSuggest}>
              {lastSuggestions.map((suggestion, index) => (
                <button className={styles.apSg} key={`sg-${index}`} onClick={() => send(suggestion)} type='button'>
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.apComposer}>
          <div className={styles.apInput}>
            <textarea
              className={styles.apTextarea}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder='Ask Autopilot to do something…'
              rows={1}
              value={draft}
            />
            <button aria-label='Send' className={styles.apSend} disabled={!draft.trim() || streaming} onClick={submit} type='button'>
              <SendIcon />
            </button>
          </div>
          <div className={styles.apNote}>
            <LinkIcon className={styles.apNoteIcon} />
            Autopilot drives the portal — it never bypasses the UI. Docked &amp; collapsible, not an overlay.
          </div>
        </div>
      </div>
    </aside>
  )
}

export default AutopilotRail

/**
 * Reflow container: wraps the app shell so the rail docks side-by-side. When the
 * rail opens, its width animates 0 → 384 and the main column (`flex:1`) shrinks —
 * the page reflows rather than being overlaid. With Autopilot disabled the rail
 * renders null and main takes the full width.
 */
export const AutopilotShell = ({ children }: { children: React.ReactNode }) => (
  <div className={styles.shellViewport}>
    <div className={styles.shellMain}>{children}</div>
    <AutopilotRail />
  </div>
)
