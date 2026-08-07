---
type: ExampleIndex
title: frontend — examples
description: Runnable widget-CR examples under examples/, each paired with a README stating preconditions and the one apply command.
resource: widgets.templates.krateo.io
tags: [examples, widgets]
timestamp: 2026-08-07T00:00:00Z
---

# Examples

Each example is a runnable manifest + a README with preconditions and the one
`kubectl apply` command. Both work against a stock Krateo installer deploy (widgets in
`krateo-system`, the frontend namespace) and become routable pages by adding one sidebar
`Menu` item (each README shows the entry to add). Every CR validates against the current
widget schemas.

- [hello-page](../examples/hello-page/README.md) — the smallest useful page: a
  convention `Flex` (`page-hello`) stacking a `Paragraph` and a `Button`; demonstrates
  `resourcesRefs` composition and routes-as-data.
- [namespaces-table](../examples/namespaces-table/README.md) — dynamic data end-to-end:
  a `Table` fed by a `RESTAction` over the Kubernetes API, with a `widgetDataTemplate`
  jq expression building the typed rows.

Worked step-by-step walkthroughs of the same flows live with the code:
[simple-page](../ui/docs/guides/simple-page/simple-page.md) and
[action-button](../ui/docs/guides/action-button/action-button.md). Per-widget example
fixtures (used by the local examples portal, `npm run examples`) are under
`ui/src/examples/widgets/`.
