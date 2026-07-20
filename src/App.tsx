import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { library } from '@fortawesome/fontawesome-svg-core'
import { fab } from '@fortawesome/free-brands-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { App as AntdApp, Spin } from 'antd'
import { useEffect, useMemo } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'

import '../index.css'
import './widgets/load'

import styles from './App.module.css'
import FiltersProvider from './components/FiltesProvider/FiltersProvider'
import { ConfigProvider, useConfigContext } from './context/ConfigContext'
import { RoutesProvider, useRoutesContext } from './context/RoutesContext'
import { useThemeMode } from './context/ThemeModeContext'
import { useLiveRefreshFirehose } from './hooks/useLiveRefresh'
import { applyOrgDefaultLocale } from './i18n'

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

/** Bridges runtime `config.json` concerns into the app once fetched: the per-tenant theme
 * override (S8/D20 — pushed up into ThemeModeProvider so antd theme + CSS vars re-derive)
 * and the Org default locale (X2/D23 — applied only when the user has no stored choice).
 * Renders nothing; both are no-ops while config is loading or when the keys are absent. */
const RuntimeConfigBridge: React.FC = () => {
  const { config } = useConfigContext()
  const { setThemeOverride } = useThemeMode()

  useEffect(() => {
    setThemeOverride(config?.theme)
  }, [config?.theme, setThemeOverride])

  useEffect(() => {
    applyOrgDefaultLocale(config?.i18n?.defaultLocale)
  }, [config?.i18n?.defaultLocale])

  return null
}

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
        <Spin indicator={<FontAwesomeIcon icon={['fas', 'spinner'] as IconProp} spin />} size='large' />
      </div>
    )
  }

  return <RouterProvider key={routerVersion} router={router} />
}

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <RuntimeConfigBridge />
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
