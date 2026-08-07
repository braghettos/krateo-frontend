---
type: Usage
title: frontend guide — a simple page
description: Worked guide — create a Button widget, compose it into a convention Flex page, and add a sidebar Menu item that routes to it.
resource: widgets.templates.krateo.io
tags: [guide, widgets]
timestamp: 2026-08-07T00:00:00Z
---

# Simple page guide

By following this guide you'll learn how to:

- create a `Button` widget;
- create a page (a `Flex` widget following the `page-<slug>` convention) that shows the
  Button;
- add a sidebar entry that navigates to the page.

## Prerequisites

- A cluster running Krateo with the portal deployed (frontend + snowplow + authn + the
  widget CRDs) — a stock [Krateo installer](../../../../docs/usage.md) deploy works. See
  [docs.krateo.io](https://docs.krateo.io/) for platform install guides.
- `kubectl` access to that cluster, and a portal login (for a test install the `admin`
  password is in the `admin-password` secret:
  `kubectl get secret admin-password -n krateo-system -o jsonpath="{.data.password}" | base64 -d`).

All resources in this guide are created in `krateo-system` — the frontend's namespace
(`config.params.FRONTEND_NAMESPACE`), which is where convention pages must live (see
[gotchas](../../gotchas.md)). Run the `kubectl apply` commands from the `ui/` directory.

## Creating a Button widget

Creating a `Button` widget is as simple as applying a manifest of kind `Button` with the
required properties inside `spec.widgetData` (the generated CRD validates it at apply
time — `actions` and `clickActionId` are required, and an empty `actions: {}` makes the
button purely decorative):

```sh
kubectl apply -f docs/guides/simple-page/guide-simple-button.yaml
```

To verify the widget has been created, run:

```sh
kubectl get buttons -n krateo-system
```

## Showing the Button in a page

The Button exists in the cluster, but a widget is only visible when another visible
widget references it. Pages in the current portal are ordinary container widgets —
typically a `Flex` — named with the convention **`page-<slug>`**:

```sh
kubectl apply -f docs/guides/simple-page/guide-simple-page.yaml
```

Examining [`guide-simple-page.yaml`](./guide-simple-page.yaml): the `Flex` is named
`page-simple-guide`, and it references our Button by name in `spec.resourcesRefs.items`
with a user-defined id (`simple-button-id`) that its `widgetData.items` displays.
Declaring resources in `spec.resourcesRefs` is how the portal loads other widgets — they
can be declared manually, like here, or dynamically via `resourcesRefsTemplate` (see
[the widget concept](../../docs.md)).

## Where is the page?

Routing is data on the sidebar **`Menu`** widget: each entry of its inline
`widgetData.items` with a `path` registers a route, and a path like `/simple-guide`
resolves its content to the `Flex` named `page-simple-guide` in the frontend namespace —
exactly the widget we just created. (An item can alternatively reference any widget
explicitly via `resourceRefId`; see [architecture](../../architecture.md).)

Find your install's sidebar menu and add an entry:

```sh
kubectl get menus -n krateo-system
kubectl edit menus <sidebar-menu-name> -n krateo-system
```

Append an item under `spec.widgetData.items`:

```yaml
- label: Simple guide
  icon: fa-sun
  path: /simple-guide
  order: 40 # lower orders sort first in the sidebar
```

## Visiting the new page

Refresh the portal: the sidebar shows the new entry, and clicking it navigates to
`/simple-guide` and renders the page — and finally our `Button` widget.

Next: make the button do something — the
[Action Button guide](../action-button/action-button.md).
