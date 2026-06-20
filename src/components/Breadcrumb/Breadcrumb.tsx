import { Breadcrumb as AntdBreadcrumb, Typography } from 'antd'
import type { BreadcrumbItemType, BreadcrumbSeparatorType } from 'antd/es/breadcrumb/Breadcrumb'
import { useEffect, useState } from 'react'
import { Link, useMatches } from 'react-router'

import styles from './Breadcrumb.module.css'

const Breadcrumb = () => {
  const [items, setItems] = useState<Partial<BreadcrumbItemType & BreadcrumbSeparatorType>[]>()
  const matches = useMatches()

  useEffect(() => {
    const path = matches.filter(({ pathname }) => pathname !== '/')[0]?.pathname?.replace('/', '')

    if (path) {
      const items: Partial<BreadcrumbItemType & BreadcrumbSeparatorType>[] = []
      const splitPath = path.split('/')
      // Collapse deep paths to section (first) + current (last) so the crumb stays short and
      // readable instead of squeezing/cutting mid-word in the narrow header — e.g.
      // /compositions/<ns>/<name> → "Compositions / <name>" (matches the mockup). Intermediate
      // levels (a bare namespace path) aren't real list routes, so nothing useful is lost.
      const shown = splitPath.length > 2 ? [splitPath[0], splitPath[splitPath.length - 1]] : splitPath

      shown.forEach((pathElement, index) => {
        const isLast = index === shown.length - 1
        const className = `${styles.breadcrumbItem} ${index === 0 ? styles.capitalize : ''}`

        items.push({
          // No antd `ellipsis` (its JS measurement over-truncates here even with room);
          // the CSS `.breadcrumbItem` truncates only past the 30ch cap, `title` is the tooltip.
          title: (
            <Typography.Text className={className} title={pathElement}>
              {isLast
                ? pathElement
                : <Link className={styles.link} to={`/${splitPath[0]}`}>{pathElement}</Link>}
            </Typography.Text>
          ),
        })
      })

      setItems(items)
    } else {
      setItems([{ title: '' }])
    }
  }, [matches])

  return <AntdBreadcrumb items={items}/>
}

export default Breadcrumb
