# krateo-frontend-chart

Krateo PlatformOps **frontend** blueprint — a fork of
[`krateoplatformops/frontend`](https://github.com/krateoplatformops/frontend) packaged as a
Krateo blueprint. The single source for both the Composable Portal SPA chart and its widget
CRDs.

Part of the [krateo-installer](https://github.com/braghettos/krateo-installer) ecosystem.

## What it ships

| Path | Chart | OCI artifact | Versioning |
|------|-------|--------------|-----------|
| `chart/` | `frontend` (appVersion 1.0.10) | `oci://ghcr.io/braghettos/krateo/frontend` | tracks the git tag |
| `crds-subchart/` | `frontend-crd` (24 widget CRDs) | `oci://ghcr.io/braghettos/krateo/frontend-crd` | pinned `1.0.25` (independent of the app tag) |

The widget CRDs (`Button`, `NavMenu`, `Page`, `Panel`, `Route`, `DataGrid`, …) version
independently of the app chart, so `crds-subchart/Chart.yaml` carries a literal `version: 1.0.25`
rather than the `CHART_VERSION` placeholder — the release workflow leaves it untouched.

## How the installer consumes it

The installer umbrella emits CompositionDefinitions that point `core-provider` at the OCI charts;
`core-provider` generates `Frontend.composition.krateo.io` + the widget CRDs and reconciles one
Composition per instance:

```yaml
apiVersion: core.krateo.io/v1alpha1
kind: CompositionDefinition
metadata:
  name: frontend
  namespace: krateo-system
spec:
  chart:
    url: oci://ghcr.io/braghettos/krateo/frontend
    version: "1.0.12"
```

## Local validation

```sh
helm lint chart
helm template smoke chart
```

## Release

Push a semver tag (`X.Y.Z`) — CI packages `chart/` (at the tag) and `crds-subchart/` (at its pinned
`1.0.25`) and publishes both to `oci://ghcr.io/braghettos/krateo`.

## Links

- Installer umbrella: https://github.com/braghettos/krateo-installer
- Upstream: https://github.com/krateoplatformops/frontend
