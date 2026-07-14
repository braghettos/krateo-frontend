/**
 * Autopilot preview bus — the tiny, pure seam between the Wave-4 read-only preview
 * VERBS (previewBlueprint / previewPage / previewRestDef, see previewHandlers.ts) and
 * the drawer COMPONENT that renders them (previewSurface.tsx). Mirrors the portal's
 * existing global-overlay pattern (widgets/Drawer: a window CustomEvent opens the
 * mounted overlay), so the pure verb handlers can open UI without holding React state.
 */

export const AUTOPILOT_PREVIEW_EVENT = 'openAutopilotPreview'

/** One previewed object: its identity headline + its YAML source. */
export interface PreviewObjectEntry {
  apiVersion?: string
  kind: string
  name?: string
  namespace?: string
  yaml: string
}

/** Everything the preview drawer renders. Pure data — the surface never fetches. */
export interface AutopilotPreviewPayload {
  /** Drawer title, named by the verb (e.g. "Blueprint preview — aws-vpc"). */
  title: string
  /** One-line qualifier under the title (e.g. "source preview — not a live render"). */
  caption?: string
  /** Render-failure text shown AS the preview content — a bad chart is data, not a crash. */
  error?: string
  /** Client-side VALIDATION errors of the previewed draft (FE-K1: the RestDefinition
   * checked against the live CRD shape) — the draft would be rejected if published. */
  problems?: string[]
  /** Warning lines (FE-K1: the CEL-immutable fields — wrong first publish = delete + recreate). */
  warnings?: string[]
  /** Structured summary lines (e.g. a RestDefinition's mapped verbs/paths). */
  summary?: string[]
  /** The objects to list: kind/name/namespace headline + collapsible YAML each. */
  objects?: PreviewObjectEntry[]
  /** FE-B1: the RAW values.schema.json string of a previewed blueprint — rendered as a
   * read-only "Create form preview" section via the production SchemaForm. Kept a
   * STRING (parsed client-side) so the draft's authoring order survives verbatim. */
  formSchema?: string
  /** previewPage v2 (FE-P4, sandbox live preview): the ROOT draft's REAL served
   * `widgetEndpoint` — the drawer mounts the portal's own WidgetRenderer on it
   * ("Rendered (live)"), so snowplow compiles + serves the drafts exactly like a
   * production page. Absent = the classic source-only drawer. */
  liveEndpoint?: string
  /** Invoked when the drawer CLOSES (the v2 teardown seam: best-effort sandbox
   * DELETEs, epoch-guarded upstream so a stale close is a no-op). Optional. */
  onClose?: () => void
}

/** Open the Autopilot preview drawer (mounted once by AutopilotProvider). */
export const openAutopilotPreview = (payload: AutopilotPreviewPayload): void => {
  window.dispatchEvent(new CustomEvent(AUTOPILOT_PREVIEW_EVENT, { detail: payload }))
}
