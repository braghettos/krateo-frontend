/**
 * callPath — coverage for the ONE snowplow `/call` write-path builder. Proves the
 * VERIFIED query contract (snowplow internal/handlers/call.go validateRequest):
 *   - apiVersion = `<group>/<version>` (URL-encoded), or the BARE version for core;
 *   - resource = the plural; namespace = the target namespace;
 *   - `name` is REQUIRED non-empty on EVERY verb (util.ParseNamespacedName) but IGNORED
 *     for a POST's apiserver URI — so an omitted name becomes the COLLECTION_POST_NAME
 *     placeholder;
 *   - the emitted path round-trips through parseTargetFromPath (the W0-2/W0-4 confirm).
 */
import { describe, expect, it } from 'vitest'

import { parseTargetFromPath } from '../components/BlastRadius/buildBlastRadius'

import { buildCallWritePath, COLLECTION_POST_NAME } from './callPath'

describe('buildCallWritePath — the snowplow /call query contract', () => {
  it('encodes a named-group target (apiVersion = group%2Fversion)', () => {
    expect(buildCallWritePath({
      group: 'composition.krateo.io',
      name: 'clickhouse-operator',
      namespace: 'krateo-system',
      resource: 'clickhouseoperators',
      version: 'v0-1-0',
    })).toBe('/call?apiVersion=composition.krateo.io%2Fv0-1-0&resource=clickhouseoperators&name=clickhouse-operator&namespace=krateo-system')
  })

  it('encodes the core group as the BARE version (how snowplow itself encodes it)', () => {
    expect(buildCallWritePath({ group: '', name: 'cm', namespace: 'kube-system', resource: 'configmaps', version: 'v1' }))
      .toBe('/call?apiVersion=v1&resource=configmaps&name=cm&namespace=kube-system')
  })

  it('substitutes the required-but-ignored placeholder when name is omitted (collection POST)', () => {
    expect(buildCallWritePath({ group: 'audit.krateo.io', namespace: 'demo', resource: 'auditrecords', version: 'v1alpha1' }))
      .toBe(`/call?apiVersion=audit.krateo.io%2Fv1alpha1&resource=auditrecords&name=${COLLECTION_POST_NAME}&namespace=demo`)
  })

  it('URL-encodes values', () => {
    expect(buildCallWritePath({ group: 'g', name: 'a b', namespace: 'ns', resource: 'r', version: 'v1' }))
      .toBe('/call?apiVersion=g%2Fv1&resource=r&name=a+b&namespace=ns')
  })

  it('round-trips through parseTargetFromPath (named group, core group, and the placeholder)', () => {
    expect(parseTargetFromPath(buildCallWritePath({ group: 'core.krateo.io', name: 'my-def', namespace: 'demo', resource: 'compositiondefinitions', version: 'v1alpha1' })))
      .toEqual({ gvr: { group: 'core.krateo.io', resource: 'compositiondefinitions', version: 'v1alpha1' }, name: 'my-def', namespace: 'demo' })
    expect(parseTargetFromPath(buildCallWritePath({ group: '', name: 'cm', namespace: 'ns', resource: 'configmaps', version: 'v1' })))
      .toEqual({ gvr: { group: '', resource: 'configmaps', version: 'v1' }, name: 'cm', namespace: 'ns' })
    // The collection-POST placeholder maps back to "no name" in the confirm.
    expect(parseTargetFromPath(buildCallWritePath({ group: 'audit.krateo.io', namespace: 'demo', resource: 'auditrecords', version: 'v1alpha1' })))
      .toEqual({ gvr: { group: 'audit.krateo.io', resource: 'auditrecords', version: 'v1alpha1' }, name: undefined, namespace: 'demo' })
  })
})
