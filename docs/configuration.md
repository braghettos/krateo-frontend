---
type: Configuration
title: frontend — configuration
description: The whole config surface — chart values with defaults, the rendered config.json contract, the nginx/port wiring, the env ConfigMap and the preview sandbox.
resource: oci://ghcr.io/krateo-platformops/charts/frontend
tags: [configuration, helm, config-json]
timestamp: 2026-08-07T00:00:00Z
---

# Configuration

Everything configurable, grounded in [`helm/frontend/values.yaml`](../helm/frontend/values.yaml)
+ [`values.schema.json`](../helm/frontend/values.schema.json) and the chart templates. The
`frontend-crds` chart has no values of its own (it only ships the CRDs).

> **Installer note:** when the Krateo installer deploys this chart, the
> `values.schema.json` **defaults** are applied — the schema, not `values.yaml`, is the
> effective source of truth for the rendered ConfigMap. The
> `values-schema-drift` CI job guards the two from drifting.

## Chart values

| Value | Default | Effect |
|---|---|---|
| `replicaCount` | `1` | Pod replicas (ignored when `autoscaling.enabled`). |
| `image.registry` / `image.repository` | `ghcr.io` / `krateo-platformops/frontend` | The SPA image. `global.imageRegistry` (default `""`) overrides the registry host on every image for mirror/air-gapped installs. |
| `image.tag` | `""` | Empty → the chart `appVersion` (the tag the release built). Pin here to override. |
| `image.pullPolicy` | `IfNotPresent` | |
| `service.type` / `service.port` | `ClusterIP` / `8080` | One value drives everything port-shaped: Service port, `containerPort`, probes **and** nginx's actual listen port (below). The installer's per-component `exposePort` lands here. |
| `ingress.*` | `enabled: false` | Standard optional ingress. |
| `resources` | `{}` | No defaults — set consciously. |
| `livenessProbe` / `readinessProbe` | HTTP `/` on `http` | Probe the SPA index. |
| `autoscaling.*` | `enabled: false` (1–100 pods, 80% CPU) | Standard HPA. |
| `serviceAccount.*` | `create: true`, `automount: true` | The portal needs no cluster permissions of its own (all data access goes through snowplow as the end user). |
| `podAnnotations` / `podLabels` / `nodeSelector` / `tolerations` / `affinity` / `podSecurityContext` / `securityContext` | `{}` | Standard pass-throughs. |
| `env` | *(unset)* | Free-form extra env vars, rendered into the `<fullname>` ConfigMap consumed via `envFrom`. |
| `config.*` | see below | Rendered verbatim into the `config.json` the SPA boots from. |
| `previewSandbox.*` | `enabled: false` | The portal-builder live-preview sandbox (below). |

The pod template carries a `checksum/configmap` annotation, so config changes roll the
Deployment.

## The `config.json` contract (`.Values.config`)

The chart renders `.Values.config` into the `<fullname>-config-vars` ConfigMap as
`config.json` (`templates/configmap.yaml`) and mounts it at `/app/config` — the SPA has
**no compiled-in endpoints** and stalls on a spinner without this file. Keys and chart
defaults:

| Key | Default | Effect |
|---|---|---|
| `SNOWPLOW_API_BASE_URL` | `http://localhost:8081` | The content API (`GET /call`) — every widget fetch. |
| `AUTHN_API_BASE_URL` | `http://localhost:8082` | Login strategies + token exchange. |
| `EVENTS_API_BASE_URL` / `EVENTS_PUSH_API_BASE_URL` | `http://localhost:8083` | Events list (`/events`) / SSE stream (`/notifications`). |
| `INIT` | `/call?resource=layouts&…&name=app-shell&namespace=krateo-system` | The bootstrap pointer to the app-shell `Layout` CR. There is no `ROUTES_LOADER` anymore — routing is data on the sidebar `Menu`. |
| `AUTOPILOT_API_BASE_URL` | `/autopilot` | Same-origin path served by the nginx `/autopilot/` proxy to the kagent A2A endpoint (no CORS). The Autopilot rail renders only when set. |
| `AUTOPILOT_AVAILABLE` | `""` | Clickability (not visibility) of the Autopilot toggle: `"false"` (set by the installer when agents aren't deployed) grays it out; `""` defers to the runtime reachability probe. |
| `OTEL_COLLECTOR_URL` | `""` | Browser OTel traces endpoint; empty = the browser SDK stays off. |
| `SNOWPLOW_IDENTITY_INJECTION` | `""` | String-typed rollout flag (installer plumbing emits strings only): `""` = legacy identity-extras behavior (safe hold-off); `"true"` = snowplow injects identity server-side. Never set `"false"` (JS truthiness trap — documented in `values.yaml`). |
| `PROVENANCE_ENABLED` | `""` | `"true"` emits one best-effort `AuditRecord` CR per gated portal write; needs the AuditRecord CRD. |
| `PREVIEW_SANDBOX_NAMESPACE` | `""` | The namespace draft widget CRs are applied into for live preview. **Do not set by hand when `previewSandbox.enabled`** — the chart then forces it to `previewSandbox.namespace` so config and provisioning cannot drift. |

The SPA additionally understands optional keys not in the chart defaults —
`WIDGET_LIVE_REFRESH_ENABLED` (default on), `RENDER_API_BASE_URL`,
`TERMINAL_SOCKET_URL`, and a `login` branding block — the full typed contract with
per-key semantics is `ui/src/context/ConfigContext.tsx` (see
[ui/docs/behavior.md](../ui/docs/behavior.md)). `params.FRONTEND_NAMESPACE` is rendered
from the release namespace, and is the namespace convention pages (`flexes/page-<slug>`)
resolve in.

## Container/nginx wiring

The image is the official nginx serving `/app`; at boot
`/docker-entrypoint.d/40-krateo-resolver.sh` (`ui/docker-entrypoint.sh`) substitutes:

1. the **listen port** from `FRONTEND_CONTAINER_PORT` (default `8080`) — which the
   Deployment sets to `service.port`, so Service, container, probes and nginx always
   agree;
2. the **cluster DNS resolver** into the `/autopilot/` proxy block, so `kagent-ui`
   resolves at *request* time — the portal starts (and `/autopilot/` degrades to 502)
   when autopilot is absent, instead of nginx crashlooping.

The `/autopilot/` location rewrites to the kagent A2A path
(`/api/a2a/krateo-system/autopilot/…`) and dials the kagent-ui Service on port 8080
with SSE-friendly settings (`ui/nginx.conf`).

## The preview sandbox (`previewSandbox.*`, default off)

When enabled, the chart provisions the quarantined namespace where the portal-builder
applies **draft** widget/RESTAction CRs so the deployed snowplow compiles them for the
in-drawer live preview: the namespace (default `krateo-preview`) with a TTL label, a
per-widget-plural object-count quota (`quota.perWidgetKind`, default 200;
`restactions`, default 50, over the plural list in `widgetPlurals` — mirrors the 43
CRDs; append new plurals here), author RBAC for the subjects in `authors` (default the
`admins` group; cohorts without a binding are fail-closed), and an hourly janitor
CronJob (`janitor.*`) deleting drafts older than `ttl` (default `24h`). The rendered
`config.json` then carries the sandbox namespace automatically. Templates:
`helm/frontend/templates/preview-sandbox/`.
