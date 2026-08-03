/* eslint-disable no-console */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { compileFromFile } from 'json-schema-to-typescript'

// For __dirname in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const baseDir = path.resolve(__dirname, '../src/widgets')

// Shared schema fragments compiled to a single canonical type. They live OUTSIDE
// src/widgets so the CRD generator does not turn them into per-widget CRDs. The
// actions fragment is the single source of truth for the WidgetActions shape —
// every action-bearing widget copies it verbatim into widgetData.actions.
const sharedSchemas = [
  {
    input: path.resolve(__dirname, '../src/schemas/actions.schema.json'),
    output: path.resolve(__dirname, '../src/types/actions.generated.d.ts'),
  },
]

async function walkDir(dir: string, callback: (filepath: string) => Promise<void>): Promise<void> {
  const files = await fs.readdir(dir)
  const tasks: Promise<void>[] = []

  for (const file of files) {
    const filepath = path.join(dir, file)
    const task = fs.stat(filepath).then(async (stat) => {
      if (stat.isDirectory()) {
        await walkDir(filepath, callback)
      } else {
        return callback(filepath)
      }
    })

    tasks.push(task)
  }

  await Promise.all(tasks)
}

async function generateTypes() {
  await walkDir(baseDir, async (filepath) => {
    if (filepath.endsWith('.schema.json')) {
      const outputPath = filepath.replace('.schema.json', '.type.d.ts')
      try {
        const ts = await compileFromFile(filepath, {
          bannerComment: '',
          style: {
            semi: false,
            singleQuote: true,
          },
        })
        await fs.writeFile(outputPath, ts)
        console.log(`Generated: ${outputPath}`)
      } catch (err) {
        console.error(`Failed to compile ${filepath}:`, err)
      }
    }
  })

  await Promise.all(sharedSchemas.map(async ({ input, output }) => {
    try {
      const ts = await compileFromFile(input, {
        bannerComment: '',
        style: {
          semi: false,
          singleQuote: true,
        },
      })
      await fs.writeFile(output, ts)
      console.log(`Generated: ${output}`)
    } catch (err) {
      console.error(`Failed to compile ${input}:`, err)
    }
  }))
}

void generateTypes()
