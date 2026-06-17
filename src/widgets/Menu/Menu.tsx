import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQueries } from '@tanstack/react-query'
import { Menu as AntdMenu } from 'antd'
import type { MenuItemType } from 'antd/es/menu/interface'
import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { useConfigContext } from '../../context/ConfigContext'
import type { AppRoute } from '../../context/RoutesContext'
import { createRoute, useRoutesContext } from '../../context/RoutesContext'
import type { ResourceRef, WidgetProps } from '../../types/Widget'
import { getAccessToken } from '../../utils/getAccessToken'
import type { NavMenuItem } from '../NavMenuItem/NavMenuItem.type'

import styles from './Menu.module.css'
import type { Menu as WidgetType } from './Menu.type'
import { buildNavModel, hasInlineNav, type InlineNavItem, type NavEntry } from './navModel'

export type MenuWidgetData = WidgetType['spec']['widgetData']

type NavMenuItemResponse = Omit<NavMenuItem, 'status'> & {
  status: {
    widgetData: NavMenuItem['spec']['widgetData']
    resourcesRefs?: {
      items: Omit<ResourceRef, 'payload'>[]
    }
  }
}

export function Menu({ resourcesRefs, uid, widgetData }: WidgetProps<MenuWidgetData>) {
  const { items: navItems = [], mode, theme } = widgetData
  const location = useLocation()
  const navigate = useNavigate()
  const { menuRoutes, registerRoutes, updateMenuRoutes } = useRoutesContext()
  const { config } = useConfigContext()
  const namespace = config?.params.FRONTEND_NAMESPACE

  // Folded form: nav data is inline on widgetData.items. Otherwise the items are
  // NavMenuItem CR references (back-compat) resolved by fetching those CRs.
  const inline = hasInlineNav(navItems as InlineNavItem[])

  const { items: refItems = [] } = resourcesRefs || {}
  const { loadedAllMenuItems, navMenuItems } = useQueries({
    combine: (results) => ({
      loadedAllMenuItems: results.every(({ status }) => status === 'success'),
      navMenuItems: results.map(({ data }) => data),
    }),
    queries: (inline ? [] : refItems).map(({ id, path }) => {
      const widgetFullUrl = `${config!.api.SNOWPLOW_API_BASE_URL}${path}`
      return {
        queryFn: async (): Promise<NavMenuItemResponse> => {
          const res = await fetch(widgetFullUrl, {
            headers: { Authorization: `Bearer ${getAccessToken()}` },
          })
          if (!res.ok) {
            throw new Error(`NavMenuItem fetch failed: ${res.status} ${res.statusText}`)
          }
          return (await res.json()) as NavMenuItemResponse
        },
        queryKey: ['navmenuitems', id, widgetFullUrl],
      }
    }),
  })

  // Unified nav model — from inline items (folded) or from fetched NavMenuItem CRs.
  const { entries, routes } = useMemo<{ entries: NavEntry[]; routes: AppRoute[] }>(() => {
    if (inline) {
      return buildNavModel(navItems as InlineNavItem[], resourcesRefs, namespace)
    }

    if (!loadedAllMenuItems) {
      return { entries: [], routes: [] }
    }

    const valid = navMenuItems.filter((item): item is NavMenuItemResponse => !!item)

    // Route-only (label-less) NavMenuItems register a route but render NO sidebar
    // entry (e.g. /search) — keeping the INIT nav the single route source, no routes-loader.
    const entriesFromCrs: NavEntry[] = valid.flatMap((item) => {
      const data = item.status?.widgetData
      return data?.label ? [{ iconName: data.icon, key: data.path, label: data.label }] : []
    })

    const routesFromCrs = valid
      .map((item): AppRoute | null => {
        const data = item.status?.widgetData
        const refs = item.status?.resourcesRefs
        if (!data || !refs) { return null }

        const routeResourceRef = refs.items.find(({ id }) => id === data.resourceRefId)
        if (!routeResourceRef) { return null }

        return { endpoint: routeResourceRef.path, path: data.path, resourceRef: { ...routeResourceRef, payload: {} }, resourceRefId: data.resourceRefId }
      })
      .filter(Boolean) as AppRoute[]

    return { entries: entriesFromCrs, routes: routesFromCrs }
  }, [inline, navItems, resourcesRefs, namespace, loadedAllMenuItems, navMenuItems])

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
