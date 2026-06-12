# `krateo-frontend-agent` — federated specialist agent

The Krateo frontend expert: authors Composable Portal widget CRDs (Table, Page, Button, NavMenu, Route, Panel, ...) and knows the SPA. Knows braghettos/frontend + braghettos/krateo-frontend-chart.

Per the [/kagent standard](https://github.com/braghettos/krateo-autopilot/blob/main/AGENTS-VERSIONING.md)
it is **component-scoped** and knows its component from this chart's `Chart.yaml` `sources`
(`braghettos/frontend`, `braghettos/krateo-frontend-chart`), read via github MCP tools.
Reachable only through the `krateo-autopilot` orchestrator (registered via `extraAgents`). Published
to `oci://ghcr.io/braghettos/krateo/krateo-frontend-agent` (pinned `0.1.0`).
