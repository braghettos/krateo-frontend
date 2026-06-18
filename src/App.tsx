import { LoadingOutlined } from '@ant-design/icons'
import { library } from '@fortawesome/fontawesome-svg-core'
import { fab } from '@fortawesome/free-brands-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { App as AntdApp, Spin } from 'antd'
import { useMemo } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'

import '../index.css'
import './widgets/load'

import styles from './App.module.css'
import FiltersProvider from './components/FiltesProvider/FiltersProvider'
import { ConfigProvider, useConfigContext } from './context/ConfigContext'
import { RoutesProvider, useRoutesContext } from './context/RoutesContext'
import { useLiveRefreshFirehose } from './hooks/useLiveRefresh'

library.add(fab, fas, far)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 30 * 1000,
    },
  },
})

const AppInitializer: React.FC = () => {
  const { isLoading: isRoutesLoading, routerVersion, routes } = useRoutesContext()
  const { isLoading: isConfigLoading } = useConfigContext()

  // Pipe the SSE event firehose into the live-refresh registry, once, for the app's lifetime.
  useLiveRefreshFirehose()

  // Use useMemo to recreate router only when routes or routeVersion changes
  const router = useMemo(() => {
    return createBrowserRouter(routes)
  }, [routes])

  if (isRoutesLoading || isConfigLoading) {
    return (
      <div className={styles.loading}>
        <Spin indicator={<LoadingOutlined />} size='large' />
      </div>
    )
  }

  return <RouterProvider key={routerVersion} router={router} />
}

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <RoutesProvider>
          <AntdApp className={styles.app}>
            <FiltersProvider>
              <AppInitializer />
            </FiltersProvider>
          </AntdApp>
        </RoutesProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </ConfigProvider>
    </QueryClientProvider>
  )
}

export default App
