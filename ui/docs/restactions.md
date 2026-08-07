---
type: Integration
title: frontend — RESTActions (how widgets get data)
description: Pointer page — RESTAction is snowplow's CRD for declarative, chainable API requests; widgets reference one via spec.apiRef and template its results.
resource: restactions.templates.krateo.io
tags: [restaction, snowplow]
timestamp: 2026-08-07T00:00:00Z
---

# RESTActions

`RESTAction` (`templates.krateo.io/v1`) is a Kubernetes CRD, owned and resolved by
**snowplow**, that declaratively defines API requests — against the Kubernetes API server
or external URLs (via an `endpointRef` Secret) — with support for chaining requests that
depend on the results of other requests and JQ `filter`s over the responses.

Widgets consume RESTActions through `spec.apiRef` (name + namespace); the api results are
then referenced by name in `widgetDataTemplate` / `resourcesRefsTemplate` jq expressions.
Usage examples are shown in [the widget concept doc](./docs.md) and the runnable
[`examples/namespaces-table`](../../examples/namespaces-table/README.md).

The authoritative RESTAction reference (field-by-field, execution model, RBAC
enforcement) lives with snowplow: the `krateo-platformops/snowplow` repo
(`go/snowplow/howto/restactions.md`) and the
[snowplow docs on docs.krateo.io](https://docs.krateo.io/key-concepts/kcp/snowplow/).
