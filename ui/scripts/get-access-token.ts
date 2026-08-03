/* eslint-disable no-console */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import select from '@inquirer/select'
import chalk from 'chalk'

function getAvailableConfigs(): string[] {
  try {
    const configDir = join(process.cwd(), 'public', 'config')
    const files = readdirSync(configDir)

    return files
      .filter((file) => file.startsWith('config.') && file.endsWith('.json'))
      .map((file) => {
        const match = file.match(/^config\.(.+)\.json$/)
        return match ? match[1] : null
      })
      .filter((config): config is string => config !== null)
      .concat(files.includes('config.json') ? ['default'] : [])
      .sort()
  } catch (error) {
    console.error('Failed to read config directory')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

const validConfigs = getAvailableConfigs()

if (validConfigs.length === 0) {
  console.error('No config files found in public/config/')
  process.exit(1)
}

function getConfigApiUrl(config: string): string {
  try {
    const configFileName = config === 'default' ? 'config.json' : `config.${config}.json`
    const configPath = join(process.cwd(), 'public', 'config', configFileName)
    const configData = JSON.parse(readFileSync(configPath, 'utf-8')) as Config
    return configData.api?.AUTHN_API_BASE_URL || 'Unknown'
  } catch {
    return 'Error reading config'
  }
}

async function selectConfig(): Promise<string> {
  try {
    const choices = validConfigs.map((config) => {
      const apiUrl = getConfigApiUrl(config)
      const configLabel = config === 'default' ? 'Default (config.json)' : `${config.charAt(0).toUpperCase() + config.slice(1)} (config.${config}.json)`
      return {
        name: `${configLabel} - ${chalk.gray(apiUrl)}`,
        value: config,
      }
    })

    return await select({
      choices,
      message: 'Select workspace configuration:',
    })
  } catch {
    console.error('Configuration selection cancelled')
    process.exit(1)
  }
}

// eslint-disable-next-line prefer-destructuring
let configType = process.argv[2]

if (!configType) {
  if (process.stdout.isTTY) {
    configType = await selectConfig()
  } else {
    configType = 'default'
    console.log(`Using default config '${configType}' in non-interactive mode`)
  }
} else if (!validConfigs.includes(configType)) {
  console.error(`Invalid config type: ${configType}. Valid options: ${validConfigs.join(', ')}`)
  process.exit(1)
}

const configFileName = configType === 'default' ? 'config.json' : `config.${configType}.json`
const configPath = join(process.cwd(), 'public', 'config', configFileName)

interface Config {
  api: {
    AUTHN_API_BASE_URL: string
  }
}

interface Credentials {
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
}

let api: Config['api']
try {
  const configData = JSON.parse(readFileSync(configPath, 'utf-8')) as Config
  api = configData.api
  if (!api?.AUTHN_API_BASE_URL) {
    throw new Error('Missing AUTHN_API_BASE_URL in config')
  }
} catch (error) {
  console.error(`\n${chalk.red('❌ Failed to load config file:')} ${chalk.cyan(configFileName)}`)
  console.error(`   Path: ${configPath}`)
  console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}

let adminUsername: string
let adminPassword: string

const credentialsFileName = configType === 'default' ? 'credentials.json' : `credentials.${configType}.json`
const credentialsPath = join(process.cwd(), 'scripts', credentialsFileName)

try {
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8')) as Credentials
  adminUsername = credentials.ADMIN_USERNAME
  adminPassword = credentials.ADMIN_PASSWORD

  if (!adminUsername || !adminPassword) {
    throw new Error('Missing ADMIN_USERNAME or ADMIN_PASSWORD in credentials file')
  }
} catch {
  console.warn(`\n${chalk.yellow('⚠️  Could not load credentials file:')} ${chalk.cyan(credentialsFileName)}`)
  console.warn(chalk.blue('🔄 Falling back to environment variables...'))

  adminUsername = process.env.ADMIN_USERNAME || ''
  adminPassword = process.env.ADMIN_PASSWORD || ''

  if (!adminUsername || !adminPassword) {
    console.error(`\n${chalk.red('❌ No credentials found!')}`)
    console.error(`\n${chalk.blue('📋 Please choose one of the following options:')}`)
    console.error(`\n${chalk.bold('1️⃣  Create credentials file:')} ${chalk.cyan(credentialsFileName)}`)
    console.error('   Example content:')
    console.error(chalk.green('   {'))
    console.error(chalk.green('     "ADMIN_USERNAME": "your-username",'))
    console.error(chalk.green('     "ADMIN_PASSWORD": "your-password"'))
    console.error(chalk.green('   }'))
    console.error(`\n${chalk.bold('2️⃣  Set environment variables:')}`)
    console.error(chalk.yellow('   export ADMIN_USERNAME="your-username"'))
    console.error(chalk.yellow('   export ADMIN_PASSWORD="your-password"'))
    process.exit(1)
  }
}

export async function getAccessToken(configType: string) {
  const loginUrl = `${api.AUTHN_API_BASE_URL}/basic/login`

  try {
    console.log(chalk.blue(`🔐 Authenticating with ${chalk.bold(configType)} configuration...`))
    console.log(chalk.gray(`   API URL: ${api.AUTHN_API_BASE_URL}`))

    const credentials = Buffer.from(`${adminUsername}:${adminPassword}`).toString('base64')

    const response = await fetch(loginUrl, {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as unknown
    const outputFileName = configType === 'default' ? 'login-response.json' : `login-response.${configType}.json`
    const outputPath = join(process.cwd(), 'scripts', outputFileName)

    writeFileSync(outputPath, JSON.stringify(data, null, 2))
    console.log(chalk.green(`✅ Token (.gitignored) saved to ${chalk.cyan(`scripts/${outputFileName}`)}`))
  } catch (error) {
    console.error(`\n${chalk.red('❌ Failed to get access token:')}`)

    if (error instanceof Error && error.message === 'fetch failed') {
      console.error(`   ${chalk.red('Connection failed:')} Could not connect to ${chalk.cyan(loginUrl)}`)
      console.error(`   ${chalk.yellow('💡 Possible causes:')}`)
      console.error(`   • The authentication service is not running`)
      console.error(`   • Wrong port or URL in config (check ${chalk.cyan(`config.${configType === 'default' ? 'json' : `${configType}.json`}`)})`)
      console.error(`   • Network connectivity issues`)
      console.error(`   • Firewall blocking the connection`)
    } else {
      console.error(`   ${error instanceof Error ? error.message : String(error)}`)
    }

    process.exit(1)
  }
}

async function main() {
  try {
    await getAccessToken(configType)
  } catch (error) {
    console.error(`\n${chalk.red('❌ Script failed:')}`)
    console.error(`   ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

void main()
