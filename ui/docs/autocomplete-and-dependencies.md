---
type: Architecture
title: frontend — Form autocomplete & dependencies (removed feature)
description: Historical note — the Form widget's autocomplete/dependencies dynamic-field configuration is not part of the current implementation; this page records the removal so old CRs and guides aren't authored against it.
resource: forms.widgets.templates.krateo.io
tags: [widgets, form, archive]
timestamp: 2026-08-07T00:00:00Z
---

# Form autocomplete & dependencies — removed

Earlier frontend versions documented two dynamic Form field configurations —
**`autocomplete`** (RESTAction-backed option lookup as the user types) and
**`dependencies`** (cascading selects re-queried when a parent field changes), with
`{ label, value }`-shaped options and initial values.

**The current implementation has neither.** The Form widget's schema
(`../src/widgets/Form/Form.schema.json`) declares no `autocomplete` or `dependencies`
properties, and no code under `ui/src/widgets/Form/` implements the option-lookup
protocol. Dynamic form content is achieved today by templating the form's `schema` /
`items` server-side (a `widgetDataTemplate` jq expression over an `apiRef` RESTAction
result — see [the widget concept](./docs.md) and the Form entry in the
[widgets API reference](./widgets-api-reference.md)).

Do not author new CRs against the removed properties: the generated CRDs reject unknown
`widgetData` fields. If a future reintroduction lands, it must re-document the contract
from the implementation, not from this note.
