import { ZoneContextManager } from '@opentelemetry/context-zone'
import { W3CTraceContextPropagator } from '@opentelemetry/core'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchSpanProcessor, WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'

/**
 * Minimal shape of the runtime config consumed by tracing init. We intentionally
 * accept a loosely-typed object (rather than the full `Config`) because tracing
 * is bootstrapped from a standalone pre-React fetch in `index.tsx`, before the
 * `ConfigProvider` / typed config is available.
 */
export interface TracingConfig {
  api: {
    /** OTLP/HTTP traces endpoint (collector). When absent, init is never called. */
    OTEL_COLLECTOR_URL?: string
    /** Cross-origin backends whose calls should carry W3C `traceparent`. */
    AUTHN_API_BASE_URL?: string
    SNOWPLOW_API_BASE_URL?: string
    EVENTS_API_BASE_URL?: string
    EVENTS_PUSH_API_BASE_URL?: string
  }
}

/** Escape a string for safe use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Build the `propagateTraceHeaderCorsUrls` allowlist as origin-anchored RegExps.
 *
 * CRITICAL: traceparent is ONLY injected on requests whose URL matches one of
 * these patterns. We derive them strictly from the configured backend origins
 * (authn / snowplow / events / events-push) so we never blanket-inject the
 * header on arbitrary cross-origin calls (which would trigger CORS preflights
 * and leak trace context to third parties). Each backend must also CORS-allow
 * the `traceparent` request header, or those requests will fail preflight.
 */
function buildCorsUrls(api: TracingConfig['api']): RegExp[] {
  const rawUrls = [
    api.AUTHN_API_BASE_URL,
    api.SNOWPLOW_API_BASE_URL,
    api.EVENTS_API_BASE_URL,
    api.EVENTS_PUSH_API_BASE_URL,
  ].filter((url): url is string => typeof url === 'string' && url.length > 0)

  const origins = new Set<string>()
  for (const url of rawUrls) {
    try {
      // Resolve relative URLs against the current document origin so same-origin
      // backends still produce a usable absolute origin.
      origins.add(new URL(url, window.location.origin).origin)
    } catch {
      // Ignore malformed URLs — a bad config entry must not break tracing init.
    }
  }

  return Array.from(origins).map((origin) => new RegExp(`^${escapeRegExp(origin)}`))
}

let initialized = false

/**
 * Initialise browser-side OTel tracing. Idempotent and side-effecting: registers
 * a global `WebTracerProvider` + fetch/XHR auto-instrumentation that start spans
 * and inject W3C traceparent on the allow-listed backend origins.
 *
 * This module is dynamically imported and only invoked when
 * `config.api.OTEL_COLLECTOR_URL` is set, so the default runtime path (no key)
 * ships byte-identical behaviour: no provider, no instrumentation, no headers.
 */
export function initTracing(cfg: TracingConfig): void {
  if (initialized) {
    return
  }

  const collectorUrl = cfg.api.OTEL_COLLECTOR_URL
  if (!collectorUrl) {
    return
  }

  initialized = true

  const propagateTraceHeaderCorsUrls = buildCorsUrls(cfg.api)

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'krateo-frontend',
    }),
    spanProcessors: [
      new BatchSpanProcessor(new OTLPTraceExporter({ url: collectorUrl })),
    ],
  })

  provider.register({
    contextManager: new ZoneContextManager(),
    propagator: new W3CTraceContextPropagator(),
  })

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        clearTimingResources: true,
        propagateTraceHeaderCorsUrls,
      }),
      new XMLHttpRequestInstrumentation({
        propagateTraceHeaderCorsUrls,
      }),
    ],
  })
}
