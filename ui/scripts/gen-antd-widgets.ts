/* eslint-disable no-console */
import chalk from 'chalk'

import { antdWidgetCatalog } from './antd-widget-catalog'
import { emitWidget } from './widget-codegen'

/**
 * Generates Krateo widgets from the antd catalog. Idempotent: existing widget
 * folders are skipped (never overwrites hand-authored widgets) unless --force.
 *
 * After running, run `npm run generate-types` (and, where a cluster is
 * available, `npm run generate-crds` + `npm run apply-crds`).
 */
async function main() {
  const force = process.argv.includes('--force')
  console.log(chalk.blue(`\n🚀 Generating ${antdWidgetCatalog.length} antd widgets${force ? ' (force)' : ''}...\n`))

  let created = 0
  let skipped = 0
  for (const spec of antdWidgetCatalog) {
    // eslint-disable-next-line no-await-in-loop
    const result = await emitWidget(spec, { force })
    if (result.status === 'created') {
      created += 1
      console.log(`✅ ${chalk.green(spec.kind)} created`)
    } else {
      skipped += 1
      console.log(`⏭️  ${chalk.gray(spec.kind)} skipped (already exists)`)
    }
  }

  console.log(`\n📊 created: ${created}, skipped: ${skipped}`)
  console.log(chalk.yellow('\nNext: npm run generate-types   (then generate-crds + apply-crds where a cluster is available)\n'))
}

void main()
