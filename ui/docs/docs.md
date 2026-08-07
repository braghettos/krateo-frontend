---
type: Architecture
title: frontend — the widget concept
description: What a widget is (a CRD mapped to a UI element), widgetData, widgetDataTemplate, actions, resourcesRefs and resourcesRefsTemplate — the authoring model of the Krateo Composable Portal.
resource: widgets.templates.krateo.io
tags: [widgets, authoring, concepts]
timestamp: 2026-08-07T00:00:00Z
---

# Widgets

In the Krateo Composable Portal everything is based on the concept of widgets and their
composition. A widget is a Kubernetes CRD that maps to a UI element in the frontend (e.g.
a `Button`) — every widget kind lives in the API group `widgets.templates.krateo.io`
(version `v1beta1`) and its plural is the lowercase kind (e.g. `buttons`, `flexes`,
`listies`).

[See all widgets](./widgets-api-reference.md) — the generated per-kind reference.

## Anatomy of a widget

A widget's source of truth is a JSON schema that is used to generate its CRD; this gives
each widget its own `kind` and schema validation at apply time.
Example: [`src/widgets/Button/Button.schema.json`](../src/widgets/Button/Button.schema.json).

Every widget `spec` has the same five top-level properties: `widgetData`,
`widgetDataTemplate`, `apiRef`, `resourcesRefs`, `resourcesRefsTemplate`.

## widgetData

Every widget has a `widgetData` property that controls how the widget looks and behaves.
In this example we define a `label`, an `icon` (using
[Font Awesome](https://fontawesome.com/search?ip=classic&s=solid&o=r) naming) and a
`type` that controls the visual style. `Button` also **requires** `actions` and
`clickActionId` (see the [API reference](./widgets-api-reference.md)); an empty `actions`
object satisfies the schema for a purely decorative button.

```yaml
# button.yaml
kind: Button
apiVersion: widgets.templates.krateo.io/v1beta1
metadata:
  name: button-1
  namespace: krateo-system
spec:
  widgetData:
    label: This is a button
    icon: fa-sun
    type: primary
    clickActionId: none
    actions: {}
```

## widgetDataTemplate

Every widget supports `spec.widgetDataTemplate`, which overrides values in
`spec.widgetData` with dynamic content computed when the widget is resolved (by
snowplow), not when it is applied.

```yaml
widgetDataTemplate:
  - forPath: dataSource
    expression: ${ .namespaces }
```

`widgetDataTemplate` is an array of objects with `forPath` and `expression` keys:

- `forPath` chooses which `widgetData` key to override, using dot notation for nesting
  (`parentProperty.childProperty`);
- `expression` is a [jq](https://jqlang.org/) expression whose result is injected at that
  path.

### Simple example

The label of this button is the date at the moment the widget is resolved:

```yaml
kind: Button
apiVersion: widgets.templates.krateo.io/v1beta1
metadata:
  name: button-with-date
  namespace: krateo-system
spec:
  widgetData:
    label: button 1
    icon: fa-rocket
    type: primary
    clickActionId: none
    actions: {}
  widgetDataTemplate:
    - forPath: label
      expression: ${ now | strftime("%Y-%m-%d") }
```

### Complete example — a Table fed by a RESTAction

```yaml
kind: Table
apiVersion: widgets.templates.krateo.io/v1beta1
metadata:
  name: table-of-namespaces
  namespace: krateo-system
spec:
  widgetData:
    allowedResources: []
    columns:
      - valueKey: name
        title: Cluster namespaces
    dataSource: []
  widgetDataTemplate:
    - forPath: dataSource
      expression: >
        ${ [ .namespaces[] | [ { valueKey: "name", kind: "jsonSchemaType", type: "string", stringValue: . } ] ] }
  apiRef:
    name: cluster-namespaces
    namespace: krateo-system
---
apiVersion: templates.krateo.io/v1
kind: RESTAction
metadata:
  name: cluster-namespaces
  namespace: krateo-system
spec:
  api:
    - name: namespaces
      path: /api/v1/namespaces
      filter: "[.namespaces.items[] | .metadata.name]"
```

A `Table` row is an **array of typed cells** (`valueKey` + `kind: jsonSchemaType` +
`type` + `stringValue`/`numberValue` — see the Table entry in the
[API reference](./widgets-api-reference.md)); the jq expression builds those rows from
the RESTAction result. (`dataSource` replaced the legacy `data` prop; the legacy
top-level `pageSize` moved to antd-shaped `pagination.pageSize`.)

### How does it work?

What is `.namespaces` in the expression? It references the result of an API named
`namespaces`:

- the widget's `spec.apiRef` references a `RESTAction` by name (`cluster-namespaces`);
- that RESTAction declares an api named `namespaces` in its `spec.api` array;
- by this chain (`Widget → apiRef → RESTAction → api`) the `widgetDataTemplate`
  expression can reference an api result by its name.

The endpoint called here is `/api/v1/namespaces`, i.e. the Kubernetes API server (calls
run under the *requesting user's* RBAC — snowplow enforces it). An absolute URL (via an
`endpointRef` Secret) reaches external APIs instead — see
[restactions.md](./restactions.md).

## actions

Actions declare widget behaviours and user interactions, defined inside `widgetData`
(typically `widgetData.actions` plus a trigger prop like `Button.clickActionId`). The
supported action types are:

- `rest` — trigger an HTTP request against the resource matching `resourceRefId` (the
  verb comes from the resource ref; payload from `payload` + jq-interpolated
  `payloadToOverride`; optional `requireConfirmation`, `successMessage`/`errorMessage`,
  `onSuccessNavigateTo`, or event-driven `onEventNavigateTo`). The legacy `payloadKey`
  prop was removed — payloads are sent as built.
- `navigate` — client-side navigation to a route `path`.
- `openDrawer` / `openModal` — render another widget (referenced by `resourceRefId`)
  inside a drawer / modal, with optional `title` and `size`.

A schema that declares `actions` must declare **all four** action groups (enforced by
`npm run validate-schemas`). The full, authoritative per-property tables for every action
type are generated per widget in the [API reference](./widgets-api-reference.md).

### Rest action example

A button that creates an nginx pod when clicked:

```yaml
kind: Button
apiVersion: widgets.templates.krateo.io/v1beta1
metadata:
  name: button-post-nginx
  namespace: krateo-system
spec:
  widgetData:
    label: Create pod
    icon: fa-rocket
    type: primary
    clickActionId: action-1
    actions:
      rest:
        - id: action-1
          resourceRefId: resource-ref-1
          type: rest
          payload:
            apiVersion: v1
            kind: Pod
            metadata:
              name: my-nginx
            spec:
              containers:
                - image: nginx:latest
                  name: nginx
                  ports:
                    - containerPort: 80
  resourcesRefs:
    items:
      - id: resource-ref-1
        apiVersion: v1
        resource: pods
        name: my-nginx
        namespace: krateo-system
        verb: POST
```

## Composing widgets

To compose complex UIs, widgets reference other widgets and RESTActions via
`spec.resourcesRefs` — an object with an `items` array:

```yaml
kind: Row
apiVersion: widgets.templates.krateo.io/v1beta1
metadata:
  name: my-row
  namespace: krateo-system
spec:
  widgetData:
    items:
      - resourceRefId: pie-chart-inside-column
        size: 6
      - resourceRefId: table-of-pods
        size: 18
  resourcesRefs:
    items:
      - id: table-of-pods
        apiVersion: widgets.templates.krateo.io/v1beta1
        name: table-of-pods
        namespace: krateo-system
        resource: tables
        verb: GET
      - id: pie-chart-inside-column
        apiVersion: widgets.templates.krateo.io/v1beta1
        name: pie-chart-inside-column
        namespace: krateo-system
        resource: piecharts
        verb: GET
```

`resourcesRefs.items` declares the referenced resources with user-defined ids; the
widget's own `widgetData` decides which of them to display and in what order (here the
`Row`'s `items`). snowplow resolves each ref **as the requesting user** and stamps
`allowed` on it; the renderer drops refs the user may not access (the RBAC gate).

### resourcesRefsTemplate

Like `widgetDataTemplate`, `resourcesRefsTemplate` populates `resourcesRefs` dynamically
from an api result:

```yaml
kind: Row
apiVersion: widgets.templates.krateo.io/v1beta1
metadata:
  name: templates-row
  namespace: my-namespace
spec:
  apiRef:
    name: templates-panels
    namespace: my-namespace
  widgetData:
    items: []
  widgetDataTemplate:
    - forPath: items
      expression: >
        ${ [ .templatespanels[] | { resourceRefId: .metadata.name, size: 12 } ] }
  resourcesRefsTemplate:
    - iterator: ${ .templatespanels }
      template:
        id: ${ .metadata.name }
        apiVersion: ${ .apiVersion }
        resource: cards
        namespace: ${ .metadata.namespace }
        name: ${ .metadata.name }
        verb: GET
```

The `iterator` loops over the result of an api named `templatespanels` and populates
`resourcesRefs` from the `template`; manually-declared `resourcesRefs.items` are merged
with the templated ones.

Recap of the chain:

- the widget references a RESTAction named `templates-panels` in `apiRef`;
- that RESTAction declares an api called `templatespanels`;
- the `resourcesRefsTemplate` iterator uses its result to build the refs.

### Widgets API reference

The generated reference listing every widget and its `widgetData` is
[widgets-api-reference.md](./widgets-api-reference.md).
