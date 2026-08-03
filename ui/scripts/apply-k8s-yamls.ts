/* eslint-disable no-console */
import { execSync } from 'node:child_process'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import readline from 'node:readline'

import chalk from 'chalk'
import { glob } from 'glob'

const WIDGETS_DIR = join(process.cwd(), 'src', 'widgets')
const EXAMPLES_DIR = join(process.cwd(), 'src', 'examples')
const CRD_OUTPUT_DIR = join(process.cwd(), 'scripts', 'krateoctl-output')

function getCurrentKubeContext(): string {
  try {
    const context = execSync('kubectl config current-context', { encoding: 'utf-8' }).trim()
    return context
  } catch (error) {
    console.error('❌ Failed to get current kubectl context')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

async function waitForEnter(message: string): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question(message, () => {
      rl.close()
      resolve()
    })
  })
}

async function confirmKubeContext(): Promise<void> {
  try {
    const currentContext = getCurrentKubeContext()

    let kubeconfigPath: string
    if (process.env.KUBECONFIG) {
      kubeconfigPath = resolve(process.env.KUBECONFIG)
    } else {
      const defaultPath = join(homedir(), '.kube', 'config')
      kubeconfigPath = defaultPath.replace(homedir(), '~')
    }

    console.log(chalk.blue(`🔧 Current kubectl context: ${chalk.bold(currentContext)}`))
    console.log(chalk.gray(`📁 KUBECONFIG: ${kubeconfigPath}\n`))

    await waitForEnter(chalk.yellow('👉 Press [Enter] to continue or [Ctrl+C] to cancel... '))
    console.log('')
  } catch {
    console.error('Confirmation cancelled')
    process.exit(1)
  }
}

function applyYamlFile(yamlPath: string): boolean {
  try {
    console.log(`Applying ${yamlPath.split('/').pop()}...`)
    execSync(`kubectl apply -f "${yamlPath}"`, { stdio: 'inherit' })
    console.log(`✅ Successfully applied ${yamlPath.split('/').pop()}`)
    return true
  } catch (error) {
    console.error(`❌ Failed to apply ${yamlPath.split('/').pop()}:`, error)
    return false
  }
}

async function applyYamlDirectory(
  title: string,
  directory: string,
  pattern = '**/*.@(yaml|yml)'
): Promise<{ success: number; failed: number; total: number }> {
  console.log(chalk.blue(`\n🚀 Applying ${title}...`))

  const yamlFiles = await glob(pattern, {
    absolute: true,
    cwd: directory,
    nocase: true,
  })

  if (yamlFiles.length === 0) {
    console.log(chalk.gray(`No YAML files found in ${directory}`))
    return { failed: 0, success: 0, total: 0 }
  }

  console.log(`Found ${yamlFiles.length} ${title.toLowerCase()} to process\n`)

  let successCount = 0
  let failureCount = 0

  for (const yamlFile of yamlFiles) {
    const success = applyYamlFile(yamlFile)
    if (success) {
      successCount += 1
    } else {
      failureCount += 1
    }
  }

  return { failed: failureCount, success: successCount, total: yamlFiles.length }
}

async function main() {
  try {
    await confirmKubeContext()

    // 1️⃣ Apply CRDs
    const crdStats = await applyYamlDirectory('CRDs', CRD_OUTPUT_DIR)

    // 2️⃣ Apply Custom Resources (widgets)
    const crStats = await applyYamlDirectory(
      'Custom Resources',
      WIDGETS_DIR,
      '**/!(*.example).@(yaml|yml)'
    )

    // 3️⃣ Apply Example Resources (examples)
    const exampleStats = await applyYamlDirectory(
      'Example Resources',
      EXAMPLES_DIR,
      '**/**/*.@(yaml|yml)'
    )

    // 📊 Unified summary
    const totalApplied = crdStats.total + crStats.total + exampleStats.total
    const totalSuccess = crdStats.success + crStats.success + exampleStats.success
    const totalFailed = crdStats.failed + crStats.failed + exampleStats.failed

    console.log(chalk.bold('\n📊 Overall Summary:'))
    console.log(`🧩 CRDs: ${crdStats.success}/${crdStats.total} applied successfully`)
    console.log(`📦 Custom Resources: ${crStats.success}/${crStats.total} applied successfully`)
    console.log(`🧪 Example Resources: ${exampleStats.success}/${exampleStats.total} applied successfully`)
    console.log('—'.repeat(40))
    console.log(`✅ Total Successful: ${totalSuccess}`)
    console.log(`❌ Total Failed: ${totalFailed}`)
    console.log(`📁 Total Processed: ${totalApplied}`)

    if (totalFailed > 0) {
      process.exit(1)
    }

    console.log('\n🎉 All YAML files have been applied successfully!')
  } catch (error) {
    console.error('\n❌ Fatal Error:')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

void main()
