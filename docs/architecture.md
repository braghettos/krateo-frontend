# krateo-frontend — architecture

How the Krateo Composable Portal SPA is built. Every claim is traced to the current tree at
`file:line`; if this page and the code disagree, the code wins. This is the **internals** view; the
deployment/CRD/wiring view lives in `braghettos/krateo-frontend-chart` `docs/` (versioned by that
repo's tags).

## What it is

A **server-driven** React 19 + Vite SPA. It ships no hardcoded product pages: the navigation,
sidebar, routes, and page content are all `Widget` custom resources fetched at runtime from
**snowplow** (which resolves the CRs into render-ready JSON). The SPA's job is to fetch a widget,
look up the React component for its `kind`, and render it. Adding UI is adding CRs in the cluster,
not editing the SPA.

Build/serve: `vite build` (`package.json:scripts.build`) produces a static bundle; the production
image (`Dockerfile`) serves `dist/` with nginx, which `try_files $uri /index.html`
(`nginx.conf:4`) — a standard SPA fallback so client-side routes resolve. Runtime config lives in
a mounted `config/config.json` volume; `Dockerfile:14` deletes the baked-in `dist/config` so
production reads the mounted file, not the build-time one.

## Entry point and provider stack

`src/index.tsx:8` mounts `<App/>` inside antd's `ConfigProvider` (theme). `src/App.tsx:55`
establishes the provider stack, from outer to inner:

```
QueryClientProvider (react-query)          App.tsx:59   — global query client, retry:false, staleTime 30s (App.tsx:25)
  ConfigProvider (app)                     App.tsx:60   — fetches /config/config.json (ConfigContext.tsx:28)
    RoutesProvider                         App.tsx:61   — holds RouteObject[] + menuRoutes (RoutesContext.tsx:89)
      AntdApp                              App.tsx:62   — antd message/notification context
        FiltersProvider                    App.tsx:63   — cross-widget filter state
          AppInitializer                   App.tsx:35   — builds the router, shows a Spin until config+routes load
```

`src/App.tsx:15` imports `./widgets/load` for its side effect — this populates the widget registry
**before first render** (see below). `AppInitializer` (`App.tsx:40`) memoizes a
`createBrowserRouter(routes)` and re-keys `<RouterProvider key={routerVersion}>` (`App.tsx:52`) so
the router is recreated whenever routes are added at runtime.

## The widget registry (the core mechanism)

A widget `kind` (string) maps to a React component through a plain registry, split into three
modules to avoid an import cycle:

- `src/widgets/widget-module.ts:9` — the `WidgetModule` contract every widget's `index.ts`
  default-exports: `{ kind, component, paginated?, aliases? }`. `defineWidget` (`:21`) is the
  identity helper enforcing the shape.
- `src/widgets/registry.ts:10` — a leaf `Map<string, WidgetModule>` plus `registerWidget`
  (`:12`, also registers `aliases` for back-compat renames) and `getWidgetModule` (`:18`). This
  module imports nothing heavy, so `WidgetRenderer` can depend on it without a cycle.
- `src/widgets/load.ts:17` — eagerly globs `./*/index.ts` (`import.meta.glob(..., { eager: true })`)
  and registers each module whose default export has a string `kind`. The glob MUST live here, not
  in `registry.ts`, because container widgets import `WidgetRenderer` → `registry.ts`; keeping the
  glob out of that leaf avoids a circular import (`load.ts:4-15` documents this). `Drawer`/`Modal`
  have an `index.ts` whose default export is the component (no `.kind`), so the guard at
  `load.ts:20` skips them.

There are ~46 widget folders under `src/widgets/` (Alert, Button, Card, DataGrid/List, Form,
Table, the chart widgets, plus the structural ones — `Route`, `Menu`, `NavMenuItem`,
`RoutesLoader`, `Page`, `Drawer`, `Modal`). Each is `src/widgets/<Kind>/` with `<Kind>.schema.json`
(CRD source of truth), `<Kind>.tsx` (the component), and `index.ts`. Authoring is documented in
`docs/widget-authoring.md`.

## Rendering a widget — `WidgetRenderer`

`src/components/WidgetRenderer/WidgetRenderer.tsx:79` is the single render path. Given a
`widgetEndpoint` it:

1. fetches the widget via `useWidgetQuery` (`WidgetRenderer.tsx:87`);
2. handles loading/error/empty states (`:99-114`) — it returns the loading skeleton on `isPending`
   (not `isLoading`) so retry-backoff gaps stay a skeleton, not the error cross (`:96-98`);
3. handles a string `status` payload (an error/`Status` envelope from the backend) including
   `401`/credentials → redirect to `/login` (`:122-146`);
4. otherwise calls `parseWidget` (`:24`), which looks up the component with `getWidgetModule(kind)`
   (`:47`), filters `resourcesRefs.items` to `allowed` ones (`:43`, the RBAC gate), and renders
   `<Component {...props} widget widgetData/>` inside a `<Suspense>` boundary (`:56`) so
   code-split widgets (the chart widgets) show a fallback while their chunk loads;
5. wraps the element in `ScrollPagination` when `module.paginated` is true (`:62`).

Container widgets render nested `WidgetRenderer`s for their child `resourcesRefs`, so a single
top-level fetch fans out into a tree of widget fetches.

## Data-fetch layer — `useWidgetQuery`

`src/hooks/useWidgetQuery.ts:46` is the canonical widget fetch. It builds the full URL as
`config.api.SNOWPLOW_API_BASE_URL + widgetEndpoint` (`:48`), attaches `Authorization: Bearer
<token>` from `getAccessToken()` (`:79-81`), and uses `useInfiniteQuery` keyed on
`['widgets', widgetEndpoint]` (`:93`).

- **Retry policy** (`:35` `shouldRetryWidgetFetch`): the global client sets `retry:false`
  (`App.tsx:29`); this hook overrides it for widget data — retry transient failures (network
  errors with no status, 5xx) up to `MAX_WIDGET_FETCH_RETRIES=3` (`:25`), never 4xx
  (auth/forbidden/not-found). `WidgetFetchError` (`:16`) carries the HTTP status so this can
  distinguish them. Backoff is capped exponential (`:44`). This is what prevents the
  "red cross on first paint" while the backend is still warming up.
- **Pagination** (`:104-139`): cumulative-slice — each page call returns the complete widget state
  for slice `[0 : page*perPage]`, so `select` returns the latest page as the current state
  (`:133`), no cross-page merge. Page advance is driven exclusively by `ScrollPagination`'s
  intersection observer; the old eager auto-pagination effect was removed (`:142-155` documents
  why).

A second fetch path exists for non-widget upstreams: `src/hooks/useApiFetch.ts` (axios-based,
generic GET/POST) and the events hooks (below).

## Routing — runtime, CR-driven

Routes are NOT statically declared beyond a small default set
(`src/context/RoutesContext.tsx:29`): `/login`, `/auth`, `/profile`, and a `*` catch-all to
`WidgetPage`. Everything else is registered at runtime:

- The **`RoutesLoader`** widget (`src/widgets/RoutesLoader/RoutesLoader.tsx:8`) renders an
  *invisible* `WidgetRenderer` for each of its `resourcesRefs.items` — these are `Route` widgets.
- Each **`Route`** widget (`src/widgets/Route/Route.tsx:11`) calls
  `registerRoutes([createRoute({ endpoint, path })])` (`:19`) on mount. `createRoute`
  (`RoutesContext.tsx:76`) maps a backend path template `/x/{namespace}/{name}` to a react-router
  path `/x/:namespace/:name` (`normalizeRouteParameters`, `:36`) and renders a `WidgetPage` whose
  endpoint has the live params substituted (`substituteEndpointParams`, `:59`).
- `registerRoutes` (`RoutesContext.tsx:114`) appends new routes and bumps `routerVersion` so
  `AppInitializer` rebuilds the router.
- The **`Menu`** widget (`src/widgets/Menu/Menu.tsx:30`) fetches each `NavMenuItem`, builds
  `menuRoutes`, persists them to `localStorage['routes']` (`:94`), and calls `updateMenuRoutes`.
  `WidgetPage` resolves the active endpoint from `menuRoutes` by `location.pathname`
  (`WidgetPage.tsx:22-23`).

The two bootstrap endpoints are runtime config: `config.api.INIT` (the sidebar nav menu) and
`config.api.ROUTES_LOADER` (the routes loader) — see `behavior.md`.

## The shell

`WidgetPage` (`src/components/WidgetPage/WidgetPage.tsx:16`) is the routed page. It renders the
`AppShell` (`src/components/AppShell/AppShell.tsx:45`, an antd `Layout` with Sider/Header/Content
slots), filling the sidebar from `config.api.INIT` (`WidgetPage.tsx:49`), the content from the
resolved `widgetEndpoint` (`:46`), and the header with `Breadcrumb` / `Notifications` / `UserMenu`
(`:47-48`). It guards auth client-side: if `localStorage['K_user']` is missing it redirects to
`/login` (`:25-31`).

## Imperative overlays — Drawer / Modal

`Drawer` and `Modal` are mounted once in `WidgetPage` (`WidgetPage.tsx:51-52`) and opened
imperatively via `window` `CustomEvent`s, not props: `openDrawer()` / `closeDrawer()`
(`src/widgets/Drawer/Drawer.tsx:14,18`) dispatch events the mounted component listens for
(`:27-44`). Actions call these to pop a form/detail without a route change.

## Build/codegen scripts

`scripts/` (run via `tsx`, see `package.json:scripts`) are dev/CI tooling, not runtime:
`gen-crds.ts` (widget `schema.json` → CRD via `krateoctl gen-widget`, output to
`scripts/krateoctl-output/`), `generate-types.ts` (schema → `.type.d.ts`), `scaffold-widget.ts`,
`gen-antd-widgets.ts`, and the example-portal runners. The CRD generation is wired into CI
(`.github/workflows/release-tag.yaml` `crds` job) which PRs the generated CRDs into
`krateo-frontend-chart`'s `crds-subchart/`.
