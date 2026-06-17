# frontend — composition wiring & operations (chart repo)

The `chart/values.yaml` surface, how the installer pins and wires the frontend, its dependencies, and
the real operational gotchas. Everything is traced to the chart; where a stale note disagrees with
the rendered chart, the chart wins.

## The `values.yaml` surface (`chart/values.yaml`)

### Exposure

- `service.type: ClusterIP`, `service.port: 8080` (`values.yaml:43-46`). The Service maps `port` →
  `targetPort: http` (`service.yaml:13-17`); `nodePort` is only rendered when `service.type ==
  NodePort` (`service.yaml:18-20`). Expose the frontend through the **installer CR**, not by
  hand-patching the Service.
- `ingress.enabled: false` by default (`values.yaml:48-49`); HPA off (`autoscaling.enabled: false`,
  `values.yaml:85-89`).

### Probes

Both `livenessProbe` and `readinessProbe` are `GET /` on the `http` port (`values.yaml:76-83`) — the
static SPA serves its index at root. There is no separate health port.

### The `config.json` surface (`config.*`) — the load-bearing wiring

The SPA reads `config.json`, mounted read-only at `/app/config` from the `<fullname>-config-vars`
ConfigMap (`deployment.yaml:52-59`, `configmap.yaml:1-25`). It is built from `.Values.config`
(`values.yaml:98-105`) into an `api` block, plus a hardcoded `params` block (`FRONTEND_NAMESPACE` =
release namespace, `DELAY_SAVE_NOTIFICATION: "10000"`, `configmap.yaml:21-24`). Keys under `config`:

| Key | Default | What it points at |
|-----|---------|-------------------|
| `SNOWPLOW_API_BASE_URL` | `http://localhost:8081` | snowplow content/composition API — **the portal's content source** |
| `AUTHN_API_BASE_URL` | `http://localhost:8082` | the authn service |
| `EVENTS_PUSH_API_BASE_URL` | `http://localhost:8083` | events push (notifications bell) |
| `EVENTS_API_BASE_URL` | `http://localhost:8083` | events / SSE stream |
| `SMITHERY_API_BASE_URL` | `http://localhost:8088` | smithery API |
| `INIT` | `/call?resource=navmenus&apiVersion=widgets.templates.krateo.io/v1beta1&name=sidebar-nav-menu&namespace=krateo-system` | the first `/call` the SPA makes — bootstraps the sidebar nav |
| `ROUTES_LOADER` | `/call?resource=routesloaders&...&name=routes-loader&...` | the `/call` that loads the route table |

The defaults are `localhost` placeholders; the installer/blueprint overrides them with the real
in-cluster Service URLs. `INIT` and `ROUTES_LOADER` are `/call` paths against snowplow — they make the
**reachable-snowplow dependency** concrete: if snowplow can't serve those, the portal boots empty.

### Resources & runtime

- `resources: {}` by default (`values.yaml:64-74`) — the static SPA is light; size via the installer
  if needed.
- The env ConfigMap (`<fullname>`) renders `.Values.env`, which is **empty by default**
  (`configmap.yaml:33-36`); runtime config flows through `config.json`, not env.

## Dependencies (what must exist around the frontend)

- **A reachable snowplow** (the content/composition API at `SNOWPLOW_API_BASE_URL`) — a hard
  prerequisite: the SPA's `INIT`/`ROUTES_LOADER` `/call`s and every widget's data come from snowplow.
- **The `frontend-crd` Composition** (the 24 widget CRDs from `crds-subchart/`, version `1.0.25`) —
  deployed as its own Composition. The app chart deliberately does NOT bundle it; see
  [overview.md](overview.md).
- **authn / events / smithery services** at the other `config.*` base URLs (login, notifications
  bell, smithery), as wired by the installer.

## How the installer wires it

The [krateo-installer](https://github.com/braghettos/krateo-installer) umbrella owns the frontend's
live `CompositionDefinition` (this repo ships a sample at `compositiondefinition.yaml`, pinned
`1.0.12`, for standalone use; the umbrella owns the deployed one, `README.md:22-37`). The umbrella
pins `spec.chart.version` to the released chart tag and points `core-provider` at
`oci://ghcr.io/braghettos/krateo/frontend`; `core-provider` reads `chart/values.schema.json`,
generates the typed CRD, and reconciles one Composition per instance. The deployed chart version is
readable from `CompositionDefinition.spec.chart.version` (the tag at which to fetch THIS repo's docs).
The `crds-subchart` (`frontend-crd 1.0.25`) is pinned separately by the installer.

## Gotchas

- **`SNOWPLOW_API_BASE_URL` must resolve, or the portal 404s.** It is a *frontend*-side setting in
  this chart's `config.json` (`values.yaml:99`). If snowplow is down or that URL doesn't resolve, the
  portal renders "404 / widget does not exist" even after a successful login. This is the
  frontend-side mirror of snowplow's own warning — owned here, not in the snowplow chart.
- **Config lives at `/app/config`, sourced from a ConfigMap.** `config.json` is mounted read-only
  from `<fullname>-config-vars` (`deployment.yaml:52-59`); changing `config.*` re-renders that
  ConfigMap. Don't bake URLs into the image.
- **Don't bundle the CRD subchart.** Adding `crds-subchart` as a dependency of `chart/` makes the app
  release try to own the 24 widget CRDs and collide with the `frontend-crd` release ("cannot be
  imported into the current release"). CRDs ship as their own Composition.
- **Widget CRDs version independently.** `crds-subchart/Chart.yaml` is a literal `1.0.25`, not the
  `CHART_VERSION` placeholder (`crds-subchart/Chart.yaml:18-20`); the release workflow leaves it
  untouched. Bump it on its own line when widget schemas change.
- **The portal UI needs a secure context.** Serve the SPA over HTTPS/localhost — over plain-HTTP
  raw-IP, browser APIs like `crypto.randomUUID` are undefined, breaking interactions. Expose via the
  installer's TLS path, never a bare-IP service patch.
- **The image tag follows `appVersion`.** `image.tag` defaults to the chart `appVersion`
  (`deployment.yaml:40`, `values.yaml:10-12`); pin a tag only to override the published image.

## See also

- [overview.md](overview.md) — chart layout, CompositionDefinition, what gets deployed.
- [crds.md](crds.md) — the 24 widget CRD fields.
- Code repo runtime view: `braghettos/krateo-frontend`
  [`docs/llms.txt`](https://github.com/braghettos/krateo-frontend/blob/main/docs/llms.txt) (SPA
  architecture, runtime config loading, routing).
- Runtime content API: snowplow (`braghettos/krateo-snowplow-chart`) — composes the widget data.
