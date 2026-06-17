import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Menu as AntdMenu } from 'antd'
import type { MenuItemType } from 'antd/es/menu/interface'
import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useConfigContext } from '../../context/ConfigContext'
import { createRoute, useRoutesContext } from '../../context/RoutesContext'
import type { WidgetProps } from '../../types/Widget'

import styles from './Menu.module.css'
import type { Menu as WidgetType } from './Menu.type'
import { buildNavModel, type InlineNavItem } from './navModel'

export type MenuWidgetData = WidgetType['spec']['widgetData']

export function Menu({ resourcesRefs, uid, widgetData }: WidgetProps<MenuWidgetData>) {
  const { items: navItems = [], mode, theme } = widgetData
  const location = useLocation()
  const navigate = useNavigate()
  const { menuRoutes, registerRoutes, updateMenuRoutes } = useRoutesContext()
  const { config } = useConfigContext()
  const namespace = config?.params.FRONTEND_NAMESPACE

  // Nav data is inline on widgetData.items (the folded form) — the single route source.
  const { entries, routes } = useMemo(
    () => buildNavModel(navItems as InlineNavItem[], resourcesRefs, namespace),
    [navItems, resourcesRefs, namespace]
  )

  useEffect(() => {
    if (routes.length > 0) {
      localStorage.setItem('routes', JSON.stringify(routes))
      updateMenuRoutes(routes)
      // Register param-capable React-Router routes from the nav — the INIT route
      // source that replaces the routes-loader. registerRoutes dedups by path.
      registerRoutes(routes.flatMap((route) => (route.endpoint ? [createRoute({ endpoint: route.endpoint, path: route.path })] : [])))
    }
  }, [routes, updateMenuRoutes, registerRoutes])

  useEffect(() => {
    if (location.pathname === '/' && menuRoutes.length > 0) {
      void navigate(menuRoutes[0].path)
    }
  }, [location.pathname, menuRoutes, navigate])

  const menuItems: MenuItemType[] = useMemo(
    () => entries.map((entry) => ({
      icon: entry.iconName ? <FontAwesomeIcon icon={entry.iconName as IconProp} /> : undefined,
      key: entry.key,
      label: entry.label,
    })),
    [entries]
  )

  return (
    <AntdMenu
      className={styles.menu}
      defaultSelectedKeys={menuItems.length > 0 ? [menuItems[0].key as string] : []}
      items={menuItems}
      key={uid}
      mode={mode ?? 'inline'}
      onClick={(item) => { void navigate(item.key) }}
      selectedKeys={[location.pathname]}
      theme={theme}
    />
  )
}
