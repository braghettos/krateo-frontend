import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useQueries } from '@tanstack/react-query'
import { Menu as AntdMenu } from 'antd'
import type { MenuItemType } from 'antd/es/menu/interface'
import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'

import WidgetRenderer from '../../components/WidgetRenderer'
import { useConfigContext } from '../../context/ConfigContext'
import type { AppRoute } from '../../context/RoutesContext'
import { useRoutesContext } from '../../context/RoutesContext'
import type { ResourceRef, WidgetProps } from '../../types/Widget'
import { getAccessToken } from '../../utils/getAccessToken'
import type { NavMenuItem } from '../NavMenuItem/NavMenuItem.type'

import styles from './Menu.module.css'
import type { Menu as WidgetType } from './Menu.type'

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
  const { mode, theme } = widgetData
  const location = useLocation()
  const navigate = useNavigate()
  const { menuRoutes, updateMenuRoutes } = useRoutesContext()
  const { config } = useConfigContext()

  /* HACK: waiting for the widgetData to return items from the backend via a restaction that sets items from resourcesRefsTemplate */
  const { items = [] } = resourcesRefs || {}

  const { loadedAllMenuItems, navMenuItems } = useQueries({
    combine: (results) => {
      return {
        isError: results.some(({ isError }) => isError),
        isLoading: results.some(({ isLoading }) => isLoading),
        loadedAllMenuItems: results.every(({ status }) => status === 'success'),
        navMenuItems: results.map(({ data }) => data),
      }
    },
    queries: (items ?? []).map(({ id, path }) => {
      const widgetFullUrl = `${config!.api.SNOWPLOW_API_BASE_URL}${path}`
      return {
        queryFn: async (): Promise<NavMenuItemResponse> => {
          const res = await fetch(widgetFullUrl, {
            headers: {
              Authorization: `Bearer ${getAccessToken()}`,
            },
          })
          if (!res.ok) {
            throw new Error(`NavMenuItem fetch failed: ${res.status} ${res.statusText}`)
          }
          const widget = (await res.json()) as NavMenuItemResponse
          return widget
        },
        queryKey: ['navmenuitems', id, widgetFullUrl],
      }
    }),
  })

  useEffect(() => {
    if (loadedAllMenuItems && navMenuItems.length > 0) {
      const validMenuItems = navMenuItems.filter((item): item is NavMenuItemResponse => !!item)

      const routesToSave = validMenuItems
        .map(item => {
          const { status } = item
          const widgetData = status?.widgetData
          const resourcesRefs = status?.resourcesRefs

          if (!widgetData || !resourcesRefs) { return null }

          const { path, resourceRefId } = widgetData
          const routeResourceRef = resourcesRefs.items.find(({ id }) => id === resourceRefId)
          if (!routeResourceRef) { return null }

          return {
            path,
            resourceRef: { ...routeResourceRef, payload: {} },
            resourceRefId,
          }
        })
        .filter(Boolean) as AppRoute[]

      localStorage.setItem('routes', JSON.stringify(routesToSave))
      updateMenuRoutes(routesToSave)
    }
  }, [loadedAllMenuItems, navMenuItems, updateMenuRoutes])

  useEffect(() => {
    if (location.pathname === '/' && menuRoutes.length > 0) {
      void navigate(menuRoutes[0].path)
    }
  }, [location.pathname, menuRoutes, navigate])

  const menuItems: MenuItemType[] = useMemo(() => {
    if (!loadedAllMenuItems) {
      return []
    }

    const validMenuItems = navMenuItems.filter((item): item is NavMenuItemResponse => !!item)

    return validMenuItems.flatMap(item => {
      const widgetData = item.status?.widgetData
      if (!widgetData) { return [] }
      const { icon, label, path } = widgetData
      return {
        icon: <FontAwesomeIcon icon={icon as IconProp} />,
        key: path,
        label,
      }
    })
  }, [navMenuItems, loadedAllMenuItems])

  const handleClick = (key: string) => {
    void navigate(key)
  }

  return (
    <>
      <AntdMenu
        className={styles.menu}
        defaultSelectedKeys={loadedAllMenuItems && menuItems.length > 0 ? [menuItems[0].key as string] : []}
        items={menuItems}
        key={uid}
        mode={mode ?? 'inline'}
        onClick={(item) => handleClick(item.key)}
        selectedKeys={[location.pathname]}
        theme={theme}
      />

      <WidgetRenderer invisible={true} widgetEndpoint={config!.api.ROUTES_LOADER} />
    </>
  )
}
