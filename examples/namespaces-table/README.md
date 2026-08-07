---
type: Example
title: frontend example — namespaces table
description: A Table widget fed by a RESTAction over the Kubernetes API — widgetDataTemplate jq builds the typed cell rows from the filtered namespace list.
resource: widgets.templates.krateo.io
tags: [example, widgets, table, restaction]
timestamp: 2026-08-07T00:00:00Z
---

# Namespaces table

Dynamic data end-to-end: a `Table` whose `apiRef` references a `RESTAction` listing the
cluster's namespaces via the Kubernetes API server; the Table's `widgetDataTemplate` jq
expression turns the filtered names into the Table's typed cell rows
(`dataSource` — see the Table entry in the
[widgets API reference](../../ui/docs/widgets-api-reference.md)). A convention `Flex`
page (`page-namespaces`) hosts it.

## Preconditions

- A stock Krateo installer deploy (portal + widget CRDs + snowplow's `RESTAction` CRD),
  frontend in `krateo-system`.
- The RESTAction runs **as the requesting user**: your portal user's RBAC must allow
  `list` on `namespaces` (test installs: `admin`).

## Apply

```sh
kubectl apply -f ./manifest.yaml
```

## Route to it

Add a sidebar entry with `path: /namespaces` to your install's sidebar menu
(`kubectl get menus -n krateo-system`, then edit its `spec.widgetData.items`):

```yaml
- label: Namespaces
  icon: fa-cubes
  path: /namespaces
  order: 41
```

`/namespaces` then renders the live table. Concepts:
[the widget concept](../../ui/docs/docs.md) and
[restactions](../../ui/docs/restactions.md).
