/**
 * Client-side token resolution for the Paragraph widget. The chart greeting jq emits the
 * literal `{localTimeOfDay}` token instead of computing morning/afternoon/evening server-side,
 * because snowplow caches a no-apiRef widget's RENDERED output with `now` FROZEN at resolve
 * time — so any server-side time-of-day is cache-incoherent (an 11:50-Rome user saw a stale
 * "Good evening"). Resolving the token in the browser makes the bucket correct for the viewer's
 * clock AND TZ on every render, immune to snowplow's render cache. See snowplow-cache-coherence.
 */

export const LOCAL_TIME_OF_DAY_TOKEN = '{localTimeOfDay}'

/** Browser-local time-of-day bucket from the viewer's clock (injectable for tests). */
export const localTimeOfDay = (now: Date = new Date()): string => {
  const hour = now.getHours()
  if (hour < 12) { return 'morning' }
  if (hour < 18) { return 'afternoon' }
  return 'evening'
}

/** Replace client-side tokens (currently {localTimeOfDay}) in a widget text string. A
 * non-string or token-free input is returned unchanged. */
export const resolveLocalTokens = (text: string | undefined): string | undefined => {
  if (typeof text !== 'string' || !text.includes(LOCAL_TIME_OF_DAY_TOKEN)) {
    return text
  }
  return text.split(LOCAL_TIME_OF_DAY_TOKEN).join(localTimeOfDay())
}
