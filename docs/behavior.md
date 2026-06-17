# krateo-frontend — runtime behavior & integration contracts

What the SPA does at runtime and the contracts it has with the backends. Traced at `file:line`
against the current tree; code wins over prose. Internals are in `architecture.md`; deployment/CRD
schema lives in `braghettos/krateo-frontend-chart` `docs/`.

## Runtime configuration — `config.json`

The SPA has no compiled-in endpoints. At boot, `ConfigContext` fetches `/config/config.json` with
`cache:'no-store'` (`src/context/ConfigContext.tsx:28-36`); in dev a `VITE_CONFIG_NAME=<name>`
selects `/config/config.<name>.json` instead (`:31-34`). The config is a react-query query keyed
on the config name (`:48-54`), and the app shows a global spinner until it resolves
(`App.tsx:44`).

Shape (`ConfigContext.tsx:4-18`, sample in `public/config/config.json`):

```json
{
  "api": {
    "AUTHN_API_BASE_URL":  "http://.../",   // authn service
    "SNOWPLOW_API_BASE_URL":"http://.../",  // content bridge (serves /call)
    "EVENTS_API_BASE_URL": "http://.../",   // events list (GET /events)
    "EVENTS_PUSH_API_BASE_URL":"http://.../",// events stream (SSE /notifications)
    "ROUTES_LOADER": "/call?resource=routesloaders&apiVersion=widgets.templates.krateo.io/v1beta1&name=routes-loader&namespace=krateo-system",
    "INIT":          "/call?resource=navmenus&apiVersion=widgets.templates.krateo.io/v1beta1&name=sidebar-nav-menu&namespace=krateo-system",
    "TERMINAL_SOCKET_URL": "..."            // optional
  },
  "params": { "FRONTEND_NAMESPACE": "...", "DELAY_SAVE_NOTIFICATION": "..." }
}
```

The production image mounts this file as a volume; the build-time `dist/config` is deleted
(`Dockerfile:14`) so the running container reads the cluster-provided config, letting one image
serve any cluster. The two `/call?...` URLs (`INIT`, `ROUTES_LOADER`) are the bootstrap pointers
into snowplow — they name the nav-menu and routes-loader CRs to fetch first.

## Upstream contracts

| Upstream | Base URL key | What the SPA calls | Code |
|----------|-------------|--------------------|------|
| **authn** | `AUTHN_API_BASE_URL` | `GET /strategies` (auth methods); the method's `path` for Basic/social login | `Login.tsx:19,40`, `Auth.tsx:24,47` |
| **snowplow** | `SNOWPLOW_API_BASE_URL` | `GET /call?resource=...&apiVersion=...&name=...&namespace=...` → a `Widget` JSON | `useWidgetQuery.ts:48`, `Menu.tsx:51` |
| **events (list)** | `EVENTS_API_BASE_URL` | `GET /events` → `SSEK8sEvent[]` | `useGetEvents.ts:19,28` |
| **events (stream)** | `EVENTS_PUSH_API_BASE_URL` | SSE `GET /notifications` (and per-action `/notifications`) | `useGetEvents.ts:21`, `useSseStream.ts:27`, `useHandleActions.ts:242` |

All widget content flows through snowplow's **`/call`** endpoint; the SPA never talks to the
Kubernetes apiserver directly. The `Widget` shape it expects is `src/types/Widget.d.ts:18`
(`metadata`, `spec`, and a `status` that is either an object with `widgetData`/`resourcesRefs`/
`actions` or a string error envelope).

## Authentication & token handling

- **Login** (`src/pages/Login/Login.tsx`): fetches `GET /strategies` (`:24`), then on submit calls
  the chosen method's `path` with `Authorization: Basic base64(user:pass)` (`:40-46`). On success
  it stores the response in `localStorage['K_user']` (`:50`) and navigates to `/`.
- **Social / OAuth callback** (`src/pages/Auth/Auth.tsx`): the provider redirects to `/auth?code=
  &state=&kind=`; the page matches `kind` against `/strategies`, validates `state` against
  `localStorage['KrateoSL']` when present (`:86`), exchanges the code via an `X-Auth-Code` header
  (`:47-52`), stores `K_user`, and navigates home (`:75-78`).
- **Token use** (`src/utils/getAccessToken.ts:5`): reads `accessToken` from `K_user`, caches it in
  a module variable (`:3,16`), and throws if no user is stored. `useWidgetQuery` and `Menu` attach
  it as `Authorization: Bearer <token>` to every `/call` (`useWidgetQuery.ts:80`, `Menu.tsx:57`).
  Note the **module-level cache is process-lifetime**: it is not invalidated on logout within the
  same page session (see `gotchas.md`).
- **Auth guard**: `WidgetPage` redirects to `/login` if `K_user` is absent on mount
  (`WidgetPage.tsx:25-31`); `WidgetRenderer` redirects on a backend `401`/credentials `Status`
  envelope (`WidgetRenderer.tsx:124-146`).

## The bootstrap sequence (cold load)

1. Fetch `config.json` (`ConfigContext`).
2. Render `WidgetPage` (catch-all route). Sidebar = `WidgetRenderer` on `config.api.INIT`
   (the nav-menu CR) (`WidgetPage.tsx:49`).
3. The **`Menu`** widget fetches each `NavMenuItem` referenced by the nav menu, derives
   `menuRoutes`, and stores them (`Menu.tsx:71-95`).
4. The **`RoutesLoader`** (reached via `config.api.ROUTES_LOADER`, rendered invisibly) renders a
   `Route` per child; each `Route` registers a react-router route (`Route.tsx:19`), bumping
   `routerVersion` so the router rebuilds (`RoutesContext.tsx:123`).
5. Navigating to a path resolves its `widgetEndpoint` (from `menuRoutes` or the registered route)
   and `WidgetRenderer` fetches+renders the page widget tree.

## Pagination

List/grid widgets are `paginated` (`WidgetModule.paginated`, `widget-module.ts:14`). When set,
`WidgetRenderer` wraps the widget in `ScrollPagination` (`WidgetRenderer.tsx:62`), an
intersection-observer that calls `fetchNextPage` when its sentinel enters the viewport.
`useWidgetQuery` uses cumulative-slice pagination: page N returns the full state for `[0:N*perPage]`
and `getNextPageParam` stops when `status.resourcesRefs.slice.continue` is false
(`useWidgetQuery.ts:110-120`). Non-paginated widgets get `undefined` immediately and never fan out.

## Actions

A widget's `status.actions` (`Widget.d.ts:48`) drive interactivity; `useHandleActions`
(`src/hooks/useHandleActions.ts`) executes them. Action `type`s:

- **`navigate`** — client-side navigation to a path (`:36,63,73`).
- **`openDrawer` / `openModal`** — pop the imperative overlay with a `widgetEndpoint`
  (`:77-92`), via the `CustomEvent` mechanism (`Drawer.tsx:14`, `Modal.tsx`).
- **`rest`** — issue an HTTP request to snowplow against the action's `resourceRef`
  (`:93`). The verb comes from the resource ref; a body is sent only for `POST/PUT/PATCH`
  (`shouldSendPayload`, `:370-375`). The payload is built by merging the action `payload` with the referenced resource
  payload and applying `payloadToOverride` (jq-interpolated) (`buildPayload`, `:93-120`).
  Optional `requireConfirmation` gates the call; `successMessage`/`errorMessage` surface antd
  notifications; `onSuccessNavigateTo` redirects on success.
- **Event-driven completion** — a `rest` action with `onEventNavigateTo` opens an SSE
  `EventSource` on `EVENTS_PUSH_API_BASE_URL/notifications` and waits for a matching `krateo`
  event `reason` before navigating (`:242` endpoint, `:279` `krateo` listener); `reloadRoutes` (default true) invalidates the
  routes queries so the menu/routes refresh (`:288-289`, `RoutesContext.tsx:104`).

## Events / notifications

`useGetEvents` (`src/hooks/useGetEvents.ts`) seeds the events list from `GET /events`
(`:28-31`, `gcTime:Infinity`, no auto-refetch — SSE supplies new events) and subscribes to the
`/notifications` SSE stream, capping the buffer at `MAX_EVENTS=200` (`:7`). `useSseStream`
(`src/hooks/useSseStream.ts:11`) is the generic SSE primitive used by the `EventList` widget:
opens an `EventSource` on `EVENTS_PUSH_API_BASE_URL + endpoint`, prepends parsed messages to a
capped buffer (`:36`), and gives up `connecting` after 10s or on error (`:28,42`).
