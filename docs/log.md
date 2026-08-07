---
type: Log
title: frontend — log
description: Curated chronological history — notable changes, decisions and incidents; release notes stay in GitHub Releases.
resource: oci://ghcr.io/krateo-platformops/charts/frontend
tags: [history]
timestamp: 2026-08-07T00:00:00Z
---

# Log

Curated history, newest first. Durable decision records and dated notes live with the
code under [`ui/docs/`](../ui/docs/llms.txt) (e.g. the executed
[antd-migration-plan](../ui/docs/antd-migration-plan.md)).

## 2026-08-07 — adopted the Krateo Documentation Standard

This bundle: root `docs/` + `examples/` + thin README; the pre-existing internals corpus
moved code-adjacent to `ui/docs/` and was re-derived file by file. The re-verification
caught real drift accumulated across the antd migration, the routes-as-data rework and
the monorepo fold, and rewrote it: docs still described the removed
`RoutesLoader`/`Route`/`Page`/`NavMenu`/`NavMenuItem` widgets and the `ROUTES_LOADER`
config key; kind rename-aliases that no longer exist; `DataGrid→List` where the
implemented kind is `Listy`; `Table.data`/`pageSize` instead of
`dataSource`/`pagination`; the removed Form `autocomplete`/`dependencies` feature and
`payloadKey` action prop; a release runbook that predated the monorepo (cross-repo PAT
instructions, wrong paths) and an `llms.txt` that pointed at this repo as "the chart
repo". The widgets API reference was regenerated from the current schemas (43 kinds).
The `crds` release job's `crds-subchart/` target is documented as a known seam in
[release.md](./release.md).

## 2026-08-04/05 — portal wiring hardening (1.4.x)

The nginx listen port became configurable (`FRONTEND_CONTAINER_PORT` ← chart
`service.port`, so the installer's shared exposure port reaches nginx itself); the
`/autopilot/` proxy repointed at kagent-ui :8080 with request-time DNS resolution (an
absent autopilot degrades to 502 instead of crashlooping the portal); the Autopilot
header toggle grays out (not hides) when the agent is unavailable
(`AUTOPILOT_AVAILABLE`).

## 2026-08-03 — the monorepo fold

The separate chart repo collapsed into `helm/` (`frontend` + `frontend-crds`, one
version line: image and both charts ship from one tag) and the app moved into `ui/`;
CI moved to the org's shared reusable workflows (multi-arch image build, canonical
`release-oci`). Known residue: the `crds` release job still targets the pre-fold
`crds-subchart/` path ([release.md](./release.md)).

## 2026-06 → 2026-07 — antd fidelity + routes-as-data + the copilot surface

The executed [antd-fidelity migration](../ui/docs/antd-migration-plan.md) (hard-break:
alias/legacy-prop purge, FlowChart on `@ant-design/graphs`, antd 6, dark mode) with the
`DataGrid→Listy` rename (Kubernetes reserves the `List` kind); the structural widgets
were removed in favor of routes-as-data on the sidebar `Menu` + the persistent Shell
layout route; the Autopilot rail, command palette, notifications rework, per-widget SSE
live refresh, provenance and the preview sandbox landed on this line.
