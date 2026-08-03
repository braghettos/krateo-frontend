/* eslint-disable no-console */
import { spawn } from 'node:child_process'

import chalk from 'chalk'

function startVite() {
  console.log(chalk.blue('🚀 Starting Vite dev server...'))

  const viteProcess = spawn('npm', ['run', 'dev'], {
    shell: true,
    stdio: 'inherit',
  })

  viteProcess.on('close', (code) => {
    console.log(chalk.red(`Vite process exited with code ${code}`))
    process.exit(code ?? 1)
  })

  return viteProcess
}

function runScript(label: string, script: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(chalk.yellow(`▶️  Running ${label}...`))

    const child = spawn('npm', ['run', ...script], {
      shell: true,
      stdio: 'inherit',
    })

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(chalk.green(`✔️  ${label} completed`))
        resolve()
      } else {
        reject(new Error(`${label} failed with exit code ${code}`))
      }
    })
  })
}

async function main() {
  // 1️⃣ Start vite first (parallel)
  startVite()

  // 2️⃣ generate CRDs
  await runScript('generate-crds', ['generate-crds'])
  await runScript('apply-crds', ['apply-crds'])

  // 3️⃣ apply examples only
  await runScript('apply-examples', ['apply-examples'])
}

void main()
