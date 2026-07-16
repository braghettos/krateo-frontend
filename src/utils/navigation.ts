import type { NavigateFunction } from 'react-router'

/**
 * An http(s):// target is an EXTERNAL link. react-router's `navigate()` treats any string as
 * an in-app route, so it mangles a full URL (e.g. a GitHub PR link) into a broken relative
 * path. External links must open in a new tab instead. This is the single predicate every
 * widget navigation site uses to tell an in-app route from an outbound URL.
 */
export const isExternalUrl = (path: string | undefined | null): boolean =>
  /^https?:\/\//i.test((path ?? '').trim())

/**
 * The one navigation entry point for every widget (Table row, List item, Button navigate
 * action). Internal routes go through react-router (optionally `resolve`d for query-merge);
 * an external http(s) URL opens in a new tab (`noopener,noreferrer`). A blank/undefined path
 * is a no-op.
 */
export const navigateOrExternal = (
  navigate: NavigateFunction,
  path: string | undefined | null,
  resolve?: (p: string) => string,
): void => {
  const target = (path ?? '').trim()
  if (!target) { return }

  if (isExternalUrl(target)) {
    window.open(target, '_blank', 'noopener,noreferrer')
    return
  }

  void navigate(resolve ? resolve(target) : target)
}
