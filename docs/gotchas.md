# krateo-frontend — gotchas

Runtime pitfalls, each grounded in the code/config. Traced at `file:line`; verify against the tree
at the deployed tag before relying on any of these.

## Config is mounted, not baked — a missing/empty volume breaks everything

The production image deletes `dist/config` at build (`Dockerfile:14`) and reads
`/config/config.json` from a mounted volume at runtime (`ConfigContext.tsx:29`). If the volume is
missing or the file is malformed, `fetchConfig` throws (`ConfigContext.tsx:38`) and the app stalls
on the global spinner (`App.tsx:44`) — there is no fallback config. The base URLs (`AUTHN_…`,
`SNOWPLOW_…`, `EVENTS_…`) and the `INIT`/`ROUTES_LOADER` bootstrap pointers all come from this file,
so the deployment-side wiring (in `krateo-frontend-chart`) is what makes the SPA functional.

## The whole UI is server-driven — a blank portal is usually a backend/CR problem

No pages are hardcoded; only `/login`, `/auth`, `/profile`, and a `*` catch-all exist by default
(`RoutesContext.tsx:29`). Sidebar, routes, and content are `Widget` CRs fetched from snowplow. An
empty sidebar or 404-everywhere portal typically means the `INIT` nav-menu CR or the
`ROUTES_LOADER` routes-loader CR (named in `config.json`) is missing/unresolvable in the cluster,
or snowplow returned an error envelope — not a frontend bug. Check the `/call` responses.

## Unknown widget `kind` throws, not degrades

`parseWidget` throws `Unknown widget kind: <kind>` when no module is registered
(`WidgetRenderer.tsx:49`). This happens when a CR's `kind` doesn't match any folder under
`src/widgets/` in the **deployed image** — e.g. a newer widget CR applied against an older frontend
image, or a renamed widget without an `aliases` entry (`registry.ts:15`). The widget version axis
is the image tag; CRDs are generated from the same source tree, so the CR schema and the renderer
must come from compatible versions.

## `isPending` vs `isLoading` — and the retry override

`WidgetRenderer` shows the skeleton on `isPending`, NOT `isLoading` (`WidgetRenderer.tsx:99`), and
`useWidgetQuery` overrides the global `retry:false` (`App.tsx:29`) with `shouldRetryWidgetFetch`
(`useWidgetQuery.ts:35,98`). Together these keep a warming-up backend showing a skeleton instead of
the error "red cross" on first paint. If you change the retry config or swap `isPending` for
`isLoading`, the cold-start UX regresses to an immediate error flash. 4xx is deliberately NOT
retried (`:37`); 5xx/network IS, up to 3 times (`:25`).

## Pagination is driven only by the intersection observer

The eager auto-pagination effect was removed (`useWidgetQuery.ts:142-155`); page advance now comes
solely from `ScrollPagination`'s intersection observer
(`src/components/Pagination/ScrollPagination.tsx`), and only for widgets wrapped by it — i.e.
`module.paginated` widgets in `WidgetRenderer` (`:62`). A widget that should paginate but isn't
marked `paginated` will only ever show page 1. Pagination is cumulative-slice: each page returns
the full state for `[0:N*perPage]` and `select` keeps the latest page (`:133`) — do not "merge"
pages or you double-count.

## The access token is cached for the process lifetime

`getAccessToken` caches the token in a module-level variable (`getAccessToken.ts:3,16`) populated
from `localStorage['K_user']` on first read. It is not cleared on logout in the same JS context, so
flows that swap the user without a full page reload can keep sending the stale `Bearer` token. The
backend `401`/credentials path forces a hard `window.location.replace('/login')`
(`WidgetRenderer.tsx:124-146`), which reloads the page and resets the cache — that reload is what
actually clears it. `getAccessToken` also throws if `K_user` is absent (`:12`), so any widget fetch
attempted before login throws rather than returning empty.

## Auth is two cooperating guards, both required

Auth is enforced both client-side (`WidgetPage` redirects to `/login` if `K_user` is missing,
`WidgetPage.tsx:25-31`) and server-side (the backend `401` `Status` envelope, handled in
`WidgetRenderer.tsx:124`). The client guard is presence-only — it does not validate the token — so
an expired/invalid token passes the client check and is caught only by the backend `401`. Don't
treat the client redirect as real authorization.

## SSE has no auth header and a silent 10s give-up

`useSseStream` opens an `EventSource` with `withCredentials:false` and no `Authorization` header
(`useSseStream.ts:32`) — the browser `EventSource` API can't set custom headers, so the events
stream must be reachable without a bearer token (the events service is expected to handle this).
After 10s with no message it flips `connecting` to false (`:28`) and `onerror` closes the source
(`:42`) without reconnecting — a transient blip can leave the stream dead until the component
remounts. The events *list* (`useGetEvents`, `/events`) is the durable source; SSE only prepends
live deltas.

## `routerVersion` re-key recreates the whole router

Registering a runtime route bumps `routerVersion` (`RoutesContext.tsx:123`) and
`<RouterProvider key={routerVersion}>` is re-keyed (`App.tsx:52`), which tears down and rebuilds the
router. `registerRoutes` de-dupes by `path` and returns the previous array unchanged when there's
nothing new (`RoutesContext.tsx:116-119`) to avoid needless rebuilds — a `Route` widget that
re-registers an existing path is a no-op, but registering many distinct routes in a burst triggers
repeated rebuilds.

## CRDs are generated from this repo, published to the chart repo

Widget CRDs are not hand-written: CI (`.github/workflows/release-tag.yaml` `crds` job) runs
`npm run generate-crds` (`scripts/gen-crds.ts`, via `krateoctl gen-widget`) over every
`*.schema.json` and opens a PR into `braghettos/krateo-frontend-chart` `crds-subchart/templates/`,
injecting `helm.sh/resource-policy: keep`. So the source of truth for a widget's cluster schema is
`src/widgets/<Kind>/<Kind>.schema.json` here, but the deployed CRD lives in the chart repo — they
can drift if the chart-side PR isn't merged for a given tag. The schema (this repo) and the CRD
(chart repo) are versioned on different axes (image tag vs chart version).
