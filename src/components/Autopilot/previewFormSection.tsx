/**
 * FE-B1 — the "Create form preview" section of the Autopilot preview drawer: the
 * PRODUCTION schema renderer (widgets/Form SchemaForm — pure antd, zero network,
 * verified server-round-trip-free) mounted READ-ONLY over the previewed blueprint's
 * values.schema.json, spliced the way blueprint-formdef splices the published one
 * (synthetic name/namespace first, "(should be hidden)" titles hidden). The author
 * sees exactly the create form a consumer would get — before anything is published.
 * Interactive-looking but wired to NOTHING: the whole antd Form is disabled and has
 * no submit path.
 */
import { Form as AntdForm, Typography } from 'antd'

import { SchemaForm } from '../../widgets/Form/SchemaFields'

import { buildFormPreviewModel } from './blueprintDraft'

export const FORM_PREVIEW_TITLE = 'Create form preview'

/** The two honest fidelity deltas vs the production form (spec §3.2), stated up front. */
export const FORM_PREVIEW_CAPTION
  = 'Read-only preview generated client-side from the draft values.schema.json — nothing is submitted. In production, namespace is an RBAC-scoped select and defaults/enums come from this draft, not a live CRD.'

/**
 * Renders the create-form preview from the RAW schema string carried by the drawer
 * payload. An unparseable or property-less schema renders nothing (the manifests
 * section still stands on its own) — never a crash.
 */
export const PreviewFormSection = ({ formSchema }: { formSchema: string }) => {
  const model = buildFormPreviewModel(formSchema)
  if (!model) {
    return null
  }
  return (
    <section data-testid='autopilot-form-preview'>
      <Typography.Title level={5}>{FORM_PREVIEW_TITLE}</Typography.Title>
      <Typography.Paragraph type='secondary'>{FORM_PREVIEW_CAPTION}</Typography.Paragraph>
      <AntdForm disabled layout='vertical'>
        <SchemaForm hide={model.hidden} schema={model.schema} />
      </AntdForm>
    </section>
  )
}

export default PreviewFormSection
