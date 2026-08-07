---
type: Usage
title: frontend guide — action button
description: Worked guide — give a Button an openDrawer action showing a Paragraph, then a Form whose rest action creates a Pod via payloadToOverride.
resource: widgets.templates.krateo.io
tags: [guide, widgets, actions]
timestamp: 2026-08-07T00:00:00Z
---

# Action Button guide

## Prerequisites

This guide depends on the [Simple page guide](../simple-page/simple-page.md) — complete
it first (it creates the `simple-guide-button` and the `page-simple-guide` page this
guide reuses). Run the `kubectl apply` commands from the `ui/` directory.

## Where we left off

We have a `Button` (`simple-guide-button`) shown by a convention `Flex` page
(`page-simple-guide`), reachable from a sidebar `Menu` item at `/simple-guide` — all in
`krateo-system`.

## Opening a drawer

We will update the `Button` to trigger an action on click. Several action types exist
(`rest`, `navigate`, `openDrawer`, `openModal` — see
[the widget concept](../../docs.md)); here we use `openDrawer`.

Note: the name and namespace of the `Button` match the one from the simple-page guide,
so applying this **overwrites** it.

```sh
kubectl apply -f docs/guides/action-button/guide-action-button.yaml
```

Click the button on `/simple-guide`: a drawer opens with the content of the `Paragraph`
widget declared in `resourcesRefs`.

## A step forward: a Form that creates a resource

Let's introduce the `Form` widget, used here to create a new resource in the cluster:

```sh
kubectl apply -f docs/guides/action-button/guide-action-button-form.yaml
```

This overwrites the same `Button` again — the drawer now renders a `Form`. Fill in the
pod name and submit: a new pod is created in the cluster (your portal user's RBAC must
allow creating pods in `krateo-system` — snowplow executes the write as you).

### How it works

- The Form's schema here is a static `stringSchema`; in real pages the schema is usually
  retrieved dynamically via a RESTAction (`schema` + `widgetDataTemplate`).
- On submit, the `rest` action referenced by `submitActionId` POSTs to the resource in
  `resourcesRefs` (`pods`, `verb: POST`).
- `payloadToOverride` jq-interpolates form values into the static `payload` — here
  `metadata.name` is replaced with the form's `name` field. (`headers` is required on
  every `rest` action; the legacy `payloadKey` nesting prop no longer exists.)
