---
type: Example
title: frontend example — hello page
description: A convention Flex page (page-hello) stacking a Paragraph and a Button, made routable at /hello by one sidebar Menu item.
resource: widgets.templates.krateo.io
tags: [example, widgets, flex]
timestamp: 2026-08-07T00:00:00Z
---

# Hello page

The smallest useful portal page: a `Flex` named with the **`page-<slug>` convention**
(`page-hello`) that stacks a `Paragraph` and a decorative `Button`. Demonstrates
`resourcesRefs` composition and the routes-as-data model.

## Preconditions

- A stock Krateo installer deploy (portal + widget CRDs), with the frontend running in
  `krateo-system` (= `config.params.FRONTEND_NAMESPACE`, where convention pages must
  live).
- A portal login; your RBAC must allow reading these widget kinds (test installs:
  `admin`).

## Apply

```sh
kubectl apply -f ./manifest.yaml
```

## Route to it

Convention pages resolve from sidebar `Menu` items: add an entry with `path: /hello` to
your install's sidebar menu (`kubectl get menus -n krateo-system`, then edit its
`spec.widgetData.items`):

```yaml
- label: Hello
  icon: fa-sun
  path: /hello
  order: 40
```

Refresh the portal: the sidebar shows **Hello**, and `/hello` renders the page. The
worked walkthrough of this flow is the
[simple-page guide](../../ui/docs/guides/simple-page/simple-page.md).
