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

      splitPath.forEach((pathElement, index) => {
        const isLast = index === splitPath.length - 1
        const className = `${styles.breadcrumbItem} ${index === 0 ? styles.capitalize : ''}`
        // The first crumb (the section) links to its list route. On a composition
        // detail route (/compositions/:namespace/:name) the namespace crumb links to
        // the per-namespace list /compositions/:namespace. Other intermediate segments
        // have no list route, so they stay plain text rather than become broken links.
        // No antd `ellipsis` (its JS measurement over-truncates even with room) — the
        // CSS truncates only past the cap; `title` is the tooltip.
        let to: string | undefined
        if (index === 0 && !isLast) {
          to = `/${splitPath[0]}`
        } else if (index === 1 && !isLast && splitPath[0] === 'compositions') {
          to = `/${splitPath[0]}/${splitPath[1]}`
        }

        items.push({
          title: (
            <Typography.Text className={className} title={pathElement}>
              {to
                ? <Link className={styles.link} to={to}>{pathElement}</Link>
                : pathElement}
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
