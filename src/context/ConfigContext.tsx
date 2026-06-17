import type { UseQueryResult } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import React, { createContext, useContext } from 'react'
export interface Config {
  api: {
    AUTHN_API_BASE_URL: string
    SNOWPLOW_API_BASE_URL: string
    EVENTS_API_BASE_URL: string
    EVENTS_PUSH_API_BASE_URL: string
    INIT: string
    TERMINAL_SOCKET_URL: string
  }
  params: {
    FRONTEND_NAMESPACE: string
    DELAY_SAVE_NOTIFICATION: string
  }
}

interface ConfigContextType {
  config: Config | undefined
  isLoading: boolean
  refetch: UseQueryResult<Config, Error>['refetch']
}

const ConfigContext = createContext<ConfigContextType | null>(null)

async function fetchConfig(): Promise<Config> {
  let configPath = '/config/config.json'

  const configName = import.meta.env.VITE_CONFIG_NAME
  if (import.meta.env.DEV && configName) {
    configPath = `/config/config.${configName}.json`
  }

  const configFile = await fetch(configPath, { cache: 'no-store' })

  if (!configFile.ok) {
    throw new Error(`Failed to fetch config: ${configFile.statusText}`)
  }

  const configJson = (await configFile.json()) as Config

  return configJson
}

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: config, isLoading, refetch } = useQuery({
    queryFn: fetchConfig,
    queryKey: ['config', import.meta.env.VITE_CONFIG_NAME || 'default'] as const,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
  })

  return (
    <ConfigContext.Provider value={{ config, isLoading, refetch }}>
      {children}
    </ConfigContext.Provider>
  )
}

export const useConfigContext = () => {
  const context = useContext(ConfigContext)

  if (!context) {
    throw new Error('useConfigContext must be used within ConfigProvider')
  }

  return context
}
