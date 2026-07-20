# Runtime theming & internationalization

Two engine-level (use-case-agnostic) mechanisms of the Composable Portal: per-install
runtime branding and app-chrome localization. Both are pure configuration — **no rebuild,
no fork** — and both degrade to the built-in defaults when unconfigured.

## Runtime per-tenant theming (`config.theme`)

The portal's design tokens (`src/theme/tokens.ts`) stay the single source of truth and the
fallback. An install can override the brand at runtime through the same ConfigMap-mounted
`config.json` that already serves the login branding:

```jsonc
{
  "api": { /* … */ },
  "params": { /* … */ },
  "theme": {
    // Rewrites the BRAND accent (buttons, links, nav highlight, focus) in BOTH color
    // modes. The four-colour semantic status language (success/error/warning/drift)
    // is intentionally left intact so status stays readable under any brand.
    "primaryColor": "#1677FF",
    // Optional token-level fine-tuning, per color mode. Keys = the palette keys of
    // src/theme/tokens.ts (background, panelbg, text, border, …).
    "palette": {
      "light": { "background": "#FAFAFA" },
      "dark": { "panelbg": "#101418" }
    }
  }
}
```

How it flows: `RuntimeConfigBridge` (src/App.tsx) pushes `config.theme` into
`ThemeModeProvider`, which re-derives **both** the antd `ConfigProvider` theme and the
`:root` CSS custom properties (`cssVariables`) from `resolvePalette(mode, override)`.
Every `*.module.css` var and every antd component follows, in light and dark mode.

Multi-tenant note: each Org/Tenant portal install mounts its own `config.json`
(ConfigMap), so per-tenant branding is a deployment concern — one chart value per tenant,
zero frontend changes.

## Internationalization (react-i18next, EN + IT)

Wiring lives in `src/i18n/` (initialized before React mounts, `src/index.tsx`). Catalogs:
`src/i18n/locales/{en,it}.json`. Adding a locale = adding a catalog file and listing it in
`SUPPORTED_LOCALES`.

Locale resolution order (first hit wins):

1. **Explicit user choice** — the language entry in the user menu, persisted in
   `localStorage` (`krateo-locale`). This is the hook point for the per-user preference
   ConfigMap (see `docs/ux-scaffolds.md`).
2. **Org/install default** — `config.json`: `{ "i18n": { "defaultLocale": "it" } }`.
3. Browser language.
4. English.

### Layer 1 — app chrome

Engine-owned strings (header controls, user menu, notifications, widget error states…)
use `useTranslation()` + catalog keys under `chrome.*`.

### Layer 2 — widget CR strings (`i18n:` convention)

Server-driven widget content is authored in Widget CRs. Any CR string can opt into
localization by prefixing an i18n key:

```yaml
spec:
  widgetData:
    label: "i18n:widgets.compositions.title"
```

`WidgetRenderer` deep-resolves `i18n:`-prefixed strings in `widgetData` against the
active locale (`src/utils/i18n-widget.ts`). Plain strings pass through untouched (existing
CRs are unaffected); unknown keys fall back to the key body (visible and greppable, never
blank). Installs can ship their own widget vocabulary at runtime via
`i18next.addResourceBundle` — no rebuild.
