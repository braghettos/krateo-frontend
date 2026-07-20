# UX mechanism scaffolds

Design notes for upcoming engine-level (use-case-agnostic) portal mechanisms. Each is a
generic capability of the Composable Portal — concrete dashboards, parameter sets and
wizard content stay downstream configuration (Widget/RESTAction CRs), never frontend code.

## Per-user dashboard personalization

Per-user dashboard/layout preferences persist as a **per-user ConfigMap** in the user's
tenant namespace, RBAC-scoped so a user can read/write only their own. No preferences CRD,
no external store.

- **Read path**: snowplow resolves the ConfigMap into the dashboard widget's
  `widgetData` (a RESTAction over the ConfigMap), so the frontend keeps rendering plain
  widgets — personalization is invisible to the renderer.
- **Write path**: the portal saves layout changes through the existing widget action
  pipeline (an `Action` that PATCHes the ConfigMap); any other producer (e.g. an
  automation agent) may write the same ConfigMap — the shape is the contract.
- **Locale**: the active-locale preference (see `docs/theming-and-i18n.md`) migrates from
  `localStorage` into the same ConfigMap once this lands, making it roam across devices.
- Suggested shape: `data.layout` (JSON: ordered widget refs + spans), `data.locale`,
  `data.theme` (user light/dark choice).

## Group-admin parameters UI

A generic "scoped parameters" editing surface for delegated administrators: a form widget
bound (via RESTAction) to a namespaced parameters object (ConfigMap or a service-owned
CR), where the **binding controls the scope** — which namespace's parameters a group
admin can edit is pure RBAC on the backing object, not frontend logic. The frontend needs
no new widget kinds: `Form` + `values.schema.json`-style validation already cover it; the
scaffold work is the RESTAction pattern + a documented example.

## Onboarding wizard shell

A reusable multi-step wizard shell driven by widget CRs: each step = a widget ref +
completion condition; progress persists in the per-user ConfigMap (above) so onboarding
survives reloads. The engine ships the shell (stepper chrome, back/next, progress
persistence); the steps' content — what a given install onboards — is entirely
CR-authored. Builds on the existing `Steps` antd component and the widget action pipeline.

## Accessibility audit notes

Current state and the audit loop for WCAG-oriented hardening:

- **Static**: `eslint-plugin-jsx-a11y` is already in the flat config — keep it blocking.
- **Runtime**: run axe-core (browser extension or `@axe-core/react` in dev) + Lighthouse
  a11y category against the shell (login → dashboard → a table widget → a form widget) per
  release; track findings as issues labeled `a11y`.
- Known areas to sweep: icon-only header buttons (all now carry `aria-label`s — keep the
  pattern), focus order in Drawer/Modal overlays, color-contrast of the soft status tints
  in BOTH color modes (the semantic palette is AA-tuned; runtime `theme.primaryColor`
  overrides shift contrast — the audit should re-check branded installs), keyboard path
  for the command palette (⌘K) and the language/theme controls.
- i18n interplay: translated strings change layout width — audit both EN and IT.
