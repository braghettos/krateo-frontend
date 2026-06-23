/* eslint-disable no-console */
import { exec } from 'node:child_process'
import fs from 'node:fs/promises'
import { join, basename, dirname } from 'node:path'
import { promisify } from 'node:util'

import chalk from 'chalk'
import { glob } from 'glob'
import yaml from 'js-yaml'

const asyncExec = promisify(exec)

const WIDGETS_DIR = join(process.cwd(), 'src', 'widgets')
const OUTPUT_DIR = join(process.cwd(), 'scripts', 'krateoctl-output')

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
}

/** Move a file, fallback to copy+unlink if rename fails */
async function moveFile(src: string, dest: string) {
  try {
    await fs.rename(src, dest)
  } catch {
    await fs.copyFile(src, dest)
    await fs.unlink(src)
  }
}

/**
 * krateoctl (via controller-gen) cannot express a JSON-Schema union like
 * `type: ["integer", "string"]` in a STRUCTURAL CRD schema — it collapses such a
 * node to `type: object`, which then rejects the real scalar values at apply time
 * (e.g. Statistic.widgetData.value `0` / `"1.4k"` → "must be of type object").
 * Post-process the generated CRD: any schema node whose `type` is an array (a
 * union) becomes the structural-schema-legal `x-kubernetes-int-or-string: true`,
 * which accepts an integer-or-string scalar (and still rejects objects) — type-
 * accurate, not relaxed. Today the only union across all widget schemas is
 * `Statistic.widgetData.value`.
 */
async function normalizeUnionTypes(schemaPath: string, crdPath: string): Promise<boolean> {
  // The SOURCE schema still has the union (`type: ["integer","string"]`); krateoctl
  // has already collapsed it to `type: object` in the CRD, so we can't detect it
  // from the CRD alone. Find the union paths in the source `spec` subtree, then
  // patch the same paths in the generated CRD's `spec` schema.
  const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8')) as Record<string, unknown>
  const unionPaths: string[][] = []
  const collect = (node: unknown, path: string[]): void => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) { return }
    const obj = node as Record<string, unknown>
    if (Array.isArray(obj.type)) { unionPaths.push(path) }
    for (const [key, value] of Object.entries(obj)) { collect(value, [...path, key]) }
  }
  collect((schema.properties as Record<string, unknown> | undefined)?.spec, [])
  if (unionPaths.length === 0) { return false }

  const doc = yaml.load(await fs.readFile(crdPath, 'utf8')) as {
    spec?: { versions?: Array<{ schema?: { openAPIV3Schema?: { properties?: { spec?: unknown } } } }> }
  }
  const crdSpec = doc.spec?.versions?.[0]?.schema?.openAPIV3Schema?.properties?.spec
  if (!crdSpec) { return false }

  let changed = false
  for (const path of unionPaths) {
    let node: unknown = crdSpec
    for (const key of path) {
      node = node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined
    }
    if (node && typeof node === 'object') {
      const target = node as Record<string, unknown>
      delete target.type
      delete target['x-kubernetes-preserve-unknown-fields']
      target['x-kubernetes-int-or-string'] = true
      changed = true
    }
  }
  if (changed) { await fs.writeFile(crdPath, yaml.dump(doc, { lineWidth: -1, noRefs: true })) }
  return changed
}

async function runKrateoctl(schemaPath: string) {
  const schemaName = basename(schemaPath)
  const widgetDir = dirname(schemaPath)
  const base = schemaName.replace(/\.schema\.json$/i, '')

  console.log(`⚙️  Generating CRD for ${chalk.cyan(schemaName)}...`)

  try {
    // Esegue il comando krateoctl
    await asyncExec(`krateoctl gen-widget "${schemaPath}"`, { cwd: widgetDir })

    // Il file generato è sempre <path>.crd.yaml (nella stessa cartella)
    const generatedPath = join(widgetDir, `${base}.schema.crd.yaml`)

    // Nome finale desiderato nella cartella di output
    const finalName = `${base}.crd.yaml`
    const destinationPath = join(OUTPUT_DIR, finalName)

    // Verifica che il file sia stato generato
    await fs.access(generatedPath)

    // Sposta e rinomina nella cartella di output
    await moveFile(generatedPath, destinationPath)

    // krateoctl can't emit JSON-Schema unions as structural CRDs — fix them up.
    const normalized = await normalizeUnionTypes(schemaPath, destinationPath)

    console.log(`✅ ${chalk.green(finalName)} moved to ${chalk.gray(OUTPUT_DIR)}${normalized ? chalk.yellow(' (union → x-kubernetes-int-or-string)') : ''}`)
    return true
  } catch (err) {
    console.error(`❌ Failed to generate CRD for ${chalk.red(schemaName)}:`)
    console.error(err instanceof Error ? err.message : String(err))
    return false
  }
}

async function main() {
  console.log(chalk.blue('🚀 Starting Krateo widget CRD generation...\n'))

  await ensureOutputDir()

  const schemaFiles = await glob('**/*.schema.json', {
    absolute: true,
    cwd: WIDGETS_DIR,
  })

  if (schemaFiles.length === 0) {
    console.error('❌ No .schema.json files found in', WIDGETS_DIR)
    process.exit(1)
  }

  console.log(`Found ${schemaFiles.length} schema files to process\n`)

  let successCount = 0
  let failureCount = 0

  for (const schemaFile of schemaFiles) {
    // eslint-disable-next-line no-await-in-loop
    const ok = await runKrateoctl(schemaFile)
    if (ok) {
      successCount += 1
    } else {
      failureCount += 1
    }
  }

  console.log('\n📊 Summary:')
  console.log(`Total schemas: ${schemaFiles.length}`)
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${failureCount}`)

  if (failureCount > 0) { process.exit(1) }
  console.log('\n🎉 All CRDs generated successfully!')
}

void main()
