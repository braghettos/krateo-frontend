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
    /** Base URL of the Krateo Autopilot (kagent) A2A endpoint. Optional: when
     * absent the Autopilot rail + header toggle do not render (graceful absence
     * for installs without autopilot deployed). */
    AUTOPILOT_API_BASE_URL?: string
    /** Kill-switch for snowplow's per-widget live-refresh SSE (`/refreshes`), which makes
     * widgets push-update when their backing cluster object changes (see hooks/refreshSse.ts).
     * **ON by default** (verified delivering on snowplow ≥1.5.13; older snowplow degrades to a
     * harmless idle stream). Set to `false` to opt an install OUT (widgets refetch as before). */
    WIDGET_LIVE_REFRESH_ENABLED?: boolean
    /** Capability flag — authored by the portal chart from the bundled snowplow version, NOT an
     * operator knob. When truthy, snowplow injects the authenticated identity (`displayName`/
     * `username`) into the resolve input server-side, so the browser STOPS volunteering them in
     * `?extras=` (see hooks/useWidgetQuery.ts buildExtrasParam) — this restores per-widget L1
     * cache sharing for identity-independent widgets. When absent/false the frontend keeps the
     * LEGACY behavior (sends identity extras), byte-identical to before the flag existed, so a new
     * frontend against an old snowplow is safe. The flag + its legacy branch are removed once the
     * fleet converges. See snowplow docs/definitive-cache-identity-architecture-2026-07-07.md §4.1. */
    SNOWPLOW_IDENTITY_INJECTION?: boolean
    /** W0-3 provenance flag. When `true`, every gated portal write (human OR agent origin)
     * fire-and-forgets ONE immutable AuditRecord CR (audit.krateo.io/v1alpha1, namespaced —
     * the CRD ships separately in the portal chart) after the write resolves. STRICTLY
     * best-effort: a missing CRD (404), RBAC (403), or network failure is swallowed and
     * never blocks/fails the primary write (see hooks/provenance.ts). **OFF by default** so
     * clusters without the AuditRecord CRD see zero new traffic. */
    PROVENANCE_ENABLED?: boolean
    /** OTLP/HTTP traces endpoint of the OpenTelemetry collector. Optional and
     * default-OFF: when absent the browser starts NO trace provider and injects
     * no W3C `traceparent` header (byte-identical default runtime path). When
     * set, the browser starts spans and propagates traceparent on the configured
     * authn/snowplow/events backend origins so browser→backend spans link
     * end-to-end. The collector's OTLP/HTTP receiver must CORS-allow the portal
     * origin, and authn/snowplow must allow the `traceparent` request header. */
    OTEL_COLLECTOR_URL?: string
  }
  params: {
    FRONTEND_NAMESPACE: string
    DELAY_SAVE_NOTIFICATION: string
  }
  /** Optional login-screen branding. Fetched pre-auth (before any backend
   * identity), so it lives in the static config (ConfigMap-mountable per install)
   * rather than a snowplow widget. Absent keys fall back to built-in defaults. */
  login?: {
    /** Branding logo for the login panel. A URL (absolute, or a path the
     * frontend serves). Should be a light/white mark — it sits on the brand
     * gradient. Falls back to the bundled Krateo logo when absent. */
    logoUrl?: string
    /** Accessible alt text for the logo. Falls back to 'Krateo | PlatformOps'. */
    logoAlt?: string
    headline?: string
    subtitle?: string
    highlights?: string[]
    /** Optional "Request an account" link target (e.g. an internal access-request
     * form or mailto). Krateo has no self-signup, so the link only renders when an
     * install sets this — no dead link by default. */
    requestAccountUrl?: string
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
