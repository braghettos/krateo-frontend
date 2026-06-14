import { useIsFetching } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router'

import { useConfigContext } from '../../context/ConfigContext'
import { useRoutesContext } from '../../context/RoutesContext'
import Page404 from '../../pages/Page404'
import Drawer from '../../widgets/Drawer'
import Modal from '../../widgets/Modal'
import AppShell from '../AppShell'
import Breadcrumb from '../Breadcrumb'
import Notifications from '../Notifications'
import ThemeToggle from '../ThemeToggle'
import UserMenu from '../UserMenu'
import WidgetRenderer from '../WidgetRenderer'

export const WidgetPage = ({ defaultWidgetEndpoint }: { defaultWidgetEndpoint?: string }) => {
  const location = useLocation()
  const { config } = useConfigContext()
  const { menuRoutes } = useRoutesContext()
  const [searchParams] = useSearchParams()
  const queryParamWidgetEndpoint = searchParams.get('widgetEndpoint')
  const currentRoute = menuRoutes.find(({ path }) => path === location.pathname)
  const widgetEndpoint = queryParamWidgetEndpoint || currentRoute?.resourceRef?.path || defaultWidgetEndpoint || ''

  useEffect(() => {
    const userData = localStorage.getItem('K_user')

    if (!userData) {
      window.location.replace('/login')
    }
  }, [])

  const isFetchingRoutes = useIsFetching({
    predicate: (query) => {
      return (
        (query.queryKey[1] as string).includes('resource=routes')
        || (query.queryKey[1] as string).includes('resource=routesloaders')
        || (query.queryKey[1] as string).includes('resource=navmenus')
      )
    },
  })

  return (
    <>
      <AppShell
        content={widgetEndpoint || isFetchingRoutes ? <WidgetRenderer key={'content'} widgetEndpoint={widgetEndpoint} /> : <Page404 />}
        headerLeft={<Breadcrumb />}
        headerRight={<><ThemeToggle /><Notifications /><UserMenu /></>}
        sidebar={<WidgetRenderer key={'sidebar'} widgetEndpoint={config!.api.INIT} />}
      />
      <Drawer />
      <Modal />
    </>
  )
}

export default WidgetPage
