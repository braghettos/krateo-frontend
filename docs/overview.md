# frontend — deployment overview (chart repo)

What the Krateo frontend is, and **how it deploys** as a Krateo composition. This is the deployment
view; the internals/runtime view (the SPA build, runtime config loading, routing) lives in the code
repo `braghettos/krateo-frontend` (`docs/`). Every claim below is traced to a file in this repo — if
a comment disagrees with what the chart actually renders, the rendered chart wins.

## What the frontend is

The Krateo **Composable Portal** — the single-page application (SPA) the user opens in the browser
(`README.md:3-6`). It is a **static SPA**: it holds no product state. Everything it shows — the nav
menu, routes, pages, panels, widgets and their data — is fetched at RUNTIME from snowplow's content
/ composition API over `/call`, which snowplow composes on demand from Kubernetes CRs. The frontend's
contribution is the declarative **widget CRDs** (this repo's `crds-subchart/`) that describe each UI
component, plus the SPA that renders them. A reachable snowplow is therefore a hard prerequisite for a
working portal (see [wiring.md](wiring.md)).

This repo is the **braghettos fork packaged as a Krateo blueprint**: the Helm chart plus a
`values.schema.json` so `core-provider` can generate a typed CompositionDefinition CRD
(`README.md:3-6`).

## Repo layout — three charts

| Path | Chart name | OCI artifact | Versioning |
|------|------------|--------------|------------|
| `chart/` | `krateo-frontend` | `oci://ghcr.io/braghettos/krateo/frontend` | tracks the git tag (`Chart.yaml` `version: CHART_VERSION`, `chart/Chart.yaml:18`) |
| `crds-subchart/` | `krateo-frontend-crd` | `oci://ghcr.io/braghettos/krateo/frontend-crd` | pinned `1.0.25`, independent of the app tag (`crds-subchart/Chart.yaml:20`) |
| `kagent/chart/` | `krateo-frontend-agent` | `oci://ghcr.io/braghettos/krateo/krateo-frontend-agent` | `0.1.x`, independent (`kagent/chart/Chart.yaml`) |

The three version **independently**:

- **The main app chart** (`chart/`) is the deployable frontend SPA workload. `version` is the
  `CHART_VERSION` placeholder, substituted to the git tag at release; `appVersion` is the
  `APP_VERSION` placeholder, stamped from the latest semver tag of the code repo
  (`chart/Chart.yaml:18,24`). The Deployment defaults the image tag to the chart `appVersion`, so the
  chart always deploys the container image the app fork actually published
  (`deployment.yaml:40`, `chart/values.yaml:10-12`).
- **The CRD subchart** (`crds-subchart/`) is deliberately **NOT bundled** into the app chart. Per the
  golden rule, CRDs live in a dedicated chart deployed as its own Composition (`frontend-crd`);
  bundling makes the app release try to own the CRDs and collide with the `frontend-crd` release. The
  CRD subchart versions independently of the app (a literal `version: 1.0.25`, NOT the placeholder),
  so the release workflow leaves it untouched (`crds-subchart/Chart.yaml:18-20`).
- **The agent chart** (`kagent/chart/`) is the federated specialist agent (`krateo-frontend-agent`)
  registered on `krateo-autopilot`; it versions on its own `0.1.x` line and is **not** the frontend
  workload (`kagent/chart/Chart.yaml:6`). `kagent/compositiondefinition.yaml` ships its
  CompositionDefinition.

## The CompositionDefinition

This repo ships a `compositiondefinition.yaml` for the frontend app (`core.krateo.io/v1alpha1`, name
`frontend`, namespace `krateo-system`, pinned `spec.chart.version: "1.0.12"`,
`compositiondefinition.yaml:1-9`), but in a full install the
[krateo-installer](https://github.com/braghettos/krateo-installer) umbrella owns the live one
(`README.md:22-37`). The umbrella emits a `CompositionDefinition` pointing `core-provider` at
`oci://ghcr.io/braghettos/krateo/frontend`; `core-provider` reads the chart's `values.schema.json`,
generates the typed CRD, and reconciles one Composition per instance. The deployed chart version is
cluster-observable from `CompositionDefinition.spec.chart.version` (this is the tag at which an agent
should fetch THIS repo's docs — see [llms.txt](llms.txt)).

## What the app chart deploys (`chart/templates/`)

Rendering the main `chart/` produces:

- **Deployment** (`deployment.yaml`) — one replica by default (`values.yaml:5`), the frontend
  container exposing a **single `http` port (containerPort = `service.port` = 8080**,
  `deployment.yaml:42-45`, `values.yaml:43-46`). The image tag defaults to the chart `appVersion`
  (`deployment.yaml:40`). The container takes env via `envFrom` the chart's env ConfigMap
  (`deployment.yaml:35-37`) and mounts the **`config.json` ConfigMap** read-only at `/app/config`
  (`deployment.yaml:52-59`).
- **Probes** — both `livenessProbe` and `readinessProbe` are `GET /` on the `http` port
  (`values.yaml:76-83`) — the SPA serves its index at the root.
- **Service** (`service.yaml`) — type `ClusterIP` by default, port 8080 → `targetPort: http`
  (`service.yaml:11-17`, `values.yaml:43-46`). `nodePort` is only rendered when `service.type ==
  NodePort` (`service.yaml:18-20`).
- **ConfigMaps** — two:
  - `<fullname>-config-vars` (`configmap.yaml:1-25`) — renders **`config.json`**: an `api` block
    built from every key under `.Values.config` (the snowplow/authn/events/smithery base URLs +
    `INIT` + `ROUTES_LOADER`) and a `params` block hardcoding `FRONTEND_NAMESPACE` (the release
    namespace) and `DELAY_SAVE_NOTIFICATION`. This is the file mounted at `/app/config` that the SPA
    reads at runtime.
  - `<fullname>` (`configmap.yaml:27-36`) — the env ConfigMap, rendering every key under
    `.Values.env` (empty by default), consumed via `envFrom`.
- **ServiceAccount** (`serviceaccount.yaml`) — created by default (`values.yaml:18-27`); no
  ClusterRole/RBAC is shipped (the static SPA needs no cluster authority — content access goes
  through snowplow).
- **Optional** — `Ingress` (`ingress.yaml`, disabled by default, `values.yaml:48-49`) and an HPA
  (`hpa.yaml`, `autoscaling.enabled: false`, `values.yaml:85-89`).

For the full `values.yaml` surface (the `config.*` base URLs, resources, exposure) and the
operational gotchas, see [wiring.md](wiring.md). For the widget CRD fields, see [crds.md](crds.md).

## Cross-references

- **Code repo (internals & runtime):** `braghettos/krateo-frontend` —
  [`docs/llms.txt`](https://github.com/braghettos/krateo-frontend/blob/main/docs/llms.txt). That set
  is versioned at the **image** tag (= chart `appVersion`); this set is versioned at the **chart**
  tag.
- **Runtime content API:** snowplow — `braghettos/krateo-snowplow-chart` /
  `braghettos/krateo-snowplow` (composes and serves the widget data the SPA renders).
- **Installer umbrella:** `braghettos/krateo-installer` (owns frontend's CompositionDefinition).
- **Upstream:** `krateoplatformops/frontend`.
