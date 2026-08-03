/* eslint-disable no-console */
import { execSync } from 'node:child_process'
import { join } from 'node:path'

import chalk from 'chalk'
import { glob } from 'glob'

const CRD_DIR = join(process.cwd(), 'scripts', 'krateoctl-output')

function applyYamlFile(path: string): boolean {
  const file = path.split('/').pop()
  try {
    console.log(`Applying CRD ${file}...`)
    execSync(`kubectl apply -f "${path}"`, { stdio: 'inherit' })
    console.log(`✅ Successfully applied ${file}`)
    return true
  } catch (err) {
    console.error(`❌ Failed to apply ${file}:`, err)
    return false
  }
}

async function main() {
  console.log(chalk.blue('\n🚀 Applying Generated CRDs...'))

  const yamlFiles = await glob('**/*.yaml', {
    absolute: true,
    cwd: CRD_DIR,
  })

  if (yamlFiles.length === 0) {
    console.log(chalk.gray('No CRDs to apply'))
    return
  }

  let ok = 0
  let fail = 0

  for (const file of yamlFiles) {
    if (applyYamlFile(file)) {
      ok += 1
    } else {
      fail += 1
    }
  }

  console.log(chalk.bold('\n📊 CRD Summary:'))
  console.log(`✔️  Applied: ${ok}`)
  console.log(`❌ Failed: ${fail}`)

  if (fail > 0) { process.exit(1) }
}

void main()
