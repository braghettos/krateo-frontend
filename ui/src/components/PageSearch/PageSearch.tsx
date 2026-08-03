import { Input as AntdInput } from 'antd'
import { useSearchParams } from 'react-router'

import styles from './PageSearch.module.css'

/**
 * Page-level search bar, rendered FRONTEND-SIDE (like the Shell ⌘K search — chrome, not a
 * widget CR) above the routed content of list/grid pages. Bound to the `?q=` URL param, which
 * flows through `buildExtrasParam` into the request `extras` so the page's data-source
 * RESTAction filters SERVER-SIDE by name/description (`.q`). Search-on-Enter (antd
 * `Input.Search`); clearing (the ✕ or emptying the field) removes the param.
 *
 * This is the "option B" path: it needs NO widget-CRD change (unlike placing an Input widget
 * as a flex child, which requires `inputs` in the Flex `allowedResources` enum — blocked on a
 * CRD-chart release + snowplow restart on this cluster). The server-side `q` filters it drives
 * are already deployed.
 */
export const PageSearch = ({ placeholder }: { placeholder?: string }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const committed = searchParams.get('q') ?? ''

  const commit = (next: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      const trimmed = next.trim()
      if (trimmed) {
        params.set('q', trimmed)
      } else {
        params.delete('q')
      }
      return params
    }, { replace: false })
  }

  return (
    <div className={styles.pageSearch}>
      <AntdInput.Search
        allowClear
        defaultValue={committed}
        // Remount when the committed value changes externally (back/forward, cleared elsewhere).
        key={committed}
        // Clearing (✕ or deleting all text) resets immediately; typing doesn't refetch — only
        // submit (Enter / the search button → onSearch) commits a query.
        onChange={(event) => { if (!event.target.value) { commit('') } }}
        onSearch={commit}
        placeholder={placeholder}
      />
    </div>
  )
}

export default PageSearch
