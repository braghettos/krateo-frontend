/* eslint-disable no-console */
import { execSync } from 'node:child_process'
import { join } from 'node:path'

import chalk from 'chalk'
import { glob } from 'glob'

const EXAMPLES_DIR = join(process.cwd(), 'src', 'examples')

function applyYamlFile(yamlPath: string): boolean {
  const filename = yamlPath.split('/').pop()
  try {
    console.log(`Applying ${filename}...`)
    execSync(`kubectl apply -f "${yamlPath}"`, { stdio: 'inherit' })
    console.log(`✅ Successfully applied ${filename}`)
    return true
  } catch (error) {
    console.error(`❌ Failed to apply ${filename}:`, error)
    return false
  }
}

async function applyExamples(): Promise<void> {
  console.log(chalk.blue('\n🚀 Applying Example Resources...'))

  const yamlFiles = await glob('**/*.@(yaml|yml)', {
    absolute: true,
    cwd: EXAMPLES_DIR,
    nocase: true,
  })

  if (yamlFiles.length === 0) {
    console.log(chalk.gray(`No YAML files found in ${EXAMPLES_DIR}`))
    return
  }

  console.log(`Found ${yamlFiles.length} example yaml files.\n`)

  let success = 0
  let failed = 0

  for (const file of yamlFiles) {
    if (applyYamlFile(file)) {
      success += 1
    } else {
      failed += 1
    }
  }

  console.log(chalk.bold('\n📊 Summary:'))
  console.log(`🧪 Example Resources: ${success}/${yamlFiles.length} applied successfully`)
  console.log(`❌ Failed: ${failed}`)

  if (failed > 0) { process.exit(1) }
}

void applyExamples()
