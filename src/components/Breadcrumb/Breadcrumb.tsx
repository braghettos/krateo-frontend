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
        if (index === splitPath.length - 1) {
          items.push({
            title: (
              <Typography.Text
                className={`${styles.breadcrumbItem} ${index === 0 ? styles.capitalize : ''}`}
                ellipsis={{ tooltip: true }}
              >
                {pathElement}
              </Typography.Text>
            ),
          })
        } else {
          const fullPath = `/${splitPath.slice(0, index + 1).join('/')}`

          items.push({
            title: (
              <Typography.Text
                className={`${styles.breadcrumbItem} ${index === 0 ? styles.capitalize : ''}`}
                ellipsis={{ tooltip: true }}
              >
                <Link className={styles.link} to={fullPath}>
                  {pathElement}
                </Link>
              </Typography.Text>
            ),
          })
        }
      })

      setItems(items)
    } else {
      setItems([{ title: '' }])
    }
  }, [matches])

  return <AntdBreadcrumb items={items}/>
}

export default Breadcrumb
