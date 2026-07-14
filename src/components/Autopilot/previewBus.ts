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
  /** Structured summary lines (e.g. a RestDefinition's mapped verbs/paths). */
  summary?: string[]
  /** The objects to list: kind/name/namespace headline + collapsible YAML each. */
  objects?: PreviewObjectEntry[]
}

/** Open the Autopilot preview drawer (mounted once by AutopilotProvider). */
export const openAutopilotPreview = (payload: AutopilotPreviewPayload): void => {
  window.dispatchEvent(new CustomEvent(AUTOPILOT_PREVIEW_EVENT, { detail: payload }))
}
