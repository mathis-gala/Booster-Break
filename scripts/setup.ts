import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

const apiEnvExamplePath = `${repoRoot}apps/api/.env.example`
const apiEnvLocalPath = `${repoRoot}apps/api/.env.local`
const webEnvExamplePath = `${repoRoot}apps/web/.env.example`
const webEnvLocalPath = `${repoRoot}apps/web/.env.local`

const localDatabaseUrl = 'postgresql://booster_break:change-me@127.0.0.1:5232/booster_break'
const setupArgs = new Set(process.argv.slice(2))
const resetDatabase = setupArgs.delete('--reset-db')

if (setupArgs.size > 0) {
  fail(`Unknown setup option: ${Array.from(setupArgs).join(', ')}`)
}

main()

function main() {
  console.log('Setting up Booster Break for local development.')

  if (resetDatabase) {
    console.log('Database reset requested. Local data in the dev database will be replaced.')
  }

  requireCommand('Bun', ['bun', '--version'], 'Install Bun from https://bun.com/docs/installation.')
  requireCommand(
    'Docker Compose',
    ['docker', 'compose', 'version'],
    'Install Docker Desktop or the Docker Compose plugin.',
  )
  requireCommand(
    'Docker daemon',
    ['docker', 'info', '--format', '{{.ServerVersion}}'],
    'Start Docker Desktop or your Docker engine, then run setup again.',
  )

  ensureEnvFile('API env', apiEnvExamplePath, apiEnvLocalPath, prepareLocalApiEnv)
  ensureEnvFile('Web env', webEnvExamplePath, webEnvLocalPath)

  const apiEnv = validateLocalApiEnv()
  const commandEnv = { ...process.env, ...apiEnv }

  run('Install workspace dependencies', ['bun', 'install', '--frozen-lockfile'])
  run('Start local Postgres', [
    'docker',
    'compose',
    '-f',
    'docker-compose.dev.yml',
    'up',
    '--wait',
    '--wait-timeout',
    '90',
    'postgres',
  ])
  run('Generate Prisma client', ['bun', '--cwd', 'apps/api', 'prisma:generate'], {
    env: commandEnv,
  })

  if (resetDatabase) {
    run(
      'Reset local database and apply migrations',
      [
        'bun',
        '--cwd',
        'apps/api',
        'prisma',
        'migrate',
        'reset',
        '--force',
        '--skip-seed',
        '--schema',
        'prisma/schema.prisma',
      ],
      { env: commandEnv },
    )
  } else {
    runPrismaMigrations(commandEnv)
  }

  run('Typecheck workspace', ['bun', 'run', 'typecheck'], { env: commandEnv })

  console.log(`
Setup complete.

Next commands:
  bun run dev:api
  bun run dev:web

Open http://127.0.0.1:5173 after both dev servers are running.
API health check: http://127.0.0.1:3100/health
`)
}

function runPrismaMigrations(env: Record<string, string | undefined>) {
  const command = ['bun', '--cwd', 'apps/api', 'prisma:migrate:deploy']

  console.log('\n==> Apply local database migrations')
  console.log(`$ ${command.join(' ')}`)

  const result = spawnSync(command[0], command.slice(1), {
    cwd: repoRoot,
    encoding: 'utf8',
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.stdout) {
    process.stdout.write(result.stdout)
  }

  if (result.stderr) {
    process.stderr.write(result.stderr)
  }

  if (result.error) {
    fail(`Apply local database migrations failed: ${result.error.message}`)
  }

  if (result.status !== 0) {
    const output = `${result.stdout}\n${result.stderr}`

    if (output.includes('P3005')) {
      fail(
        'Prisma found an existing non-empty local schema without migration history.',
        [
          'This usually means the local Docker volume was created before migrations were used.',
          'If the local database data is disposable, run: bun setup --reset-db',
          'The default setup command will not reset or baseline an existing database automatically.',
        ].join('\n'),
      )
    }

    process.exit(result.status ?? 1)
  }
}

function requireCommand(label: string, command: string[], hint: string) {
  const result = spawnSync(command[0], command.slice(1), {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.error || result.status !== 0) {
    fail(`${label} is not available.`, hint)
  }

  const version = (result.stdout || result.stderr).trim().split('\n')[0]
  console.log(`OK: ${label}${version ? ` (${version})` : ''}`)
}

function run(
  label: string,
  command: string[],
  options: { env?: Record<string, string | undefined> } = {},
) {
  console.log(`\n==> ${label}`)
  console.log(`$ ${command.join(' ')}`)

  const result = spawnSync(command[0], command.slice(1), {
    cwd: repoRoot,
    env: options.env ?? process.env,
    stdio: 'inherit',
  })

  if (result.error) {
    fail(`${label} failed: ${result.error.message}`)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function ensureEnvFile(
  label: string,
  sourcePath: string,
  targetPath: string,
  prepareContent: (content: string) => string = ensureTrailingNewline,
) {
  if (existsSync(targetPath)) {
    console.log(`OK: ${label} already exists at ${relativePath(targetPath)}; leaving it unchanged.`)
    return
  }

  const content = prepareContent(readFileSync(sourcePath, 'utf8'))
  writeFileSync(targetPath, content)
  console.log(`Created ${relativePath(targetPath)} from ${relativePath(sourcePath)}.`)
}

function prepareLocalApiEnv(content: string): string {
  return ensureTrailingNewline(
    setEnvValue(setEnvValue(content, 'DATABASE_URL', localDatabaseUrl), 'DEV_AUTH_ENABLED', 'true'),
  )
}

function setEnvValue(content: string, key: string, value: string): string {
  const lines = content.split(/\r?\n/)
  let found = false

  const nextLines = lines.map((line) => {
    if (line.match(new RegExp(`^${key}=`))) {
      found = true
      return `${key}=${value}`
    }

    return line
  })

  if (!found) {
    nextLines.push(`${key}=${value}`)
  }

  return nextLines.join('\n')
}

function validateLocalApiEnv(): Record<string, string> {
  const env = parseEnvFile(apiEnvLocalPath)
  const databaseUrl = env.DATABASE_URL

  if (!databaseUrl) {
    fail(
      `${relativePath(apiEnvLocalPath)} is missing DATABASE_URL.`,
      `Set DATABASE_URL=${localDatabaseUrl} and run setup again.`,
    )
  }

  let parsedDatabaseUrl: URL

  try {
    parsedDatabaseUrl = new URL(databaseUrl)
  } catch {
    fail(
      `${relativePath(apiEnvLocalPath)} has an invalid DATABASE_URL.`,
      `Set DATABASE_URL=${localDatabaseUrl} and run setup again.`,
    )
  }

  const isLocalHost =
    parsedDatabaseUrl.hostname === '127.0.0.1' || parsedDatabaseUrl.hostname === 'localhost'
  const usesDevPort = parsedDatabaseUrl.port === '5232'

  if (!isLocalHost || !usesDevPort) {
    fail(
      `${relativePath(apiEnvLocalPath)} points DATABASE_URL at ${maskDatabaseUrl(parsedDatabaseUrl)}.`,
      [
        'For the default setup flow, DATABASE_URL must target the local Docker Postgres published on 127.0.0.1:5232.',
        `Set DATABASE_URL=${localDatabaseUrl} for a fresh local environment.`,
        'Use postgres:5432 only when the API itself runs inside Docker Compose.',
      ].join('\n'),
    )
  }

  return env
}

function parseEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {}

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/)

    if (!match) {
      continue
    }

    env[match[1]] = unquoteEnvValue(match[2].trim())
  }

  return env
}

function unquoteEnvValue(value: string): string {
  const first = value[0]
  const last = value[value.length - 1]

  if ((first === '"' || first === "'" || first === '`') && first === last) {
    return value.slice(1, -1)
  }

  return value
}

function maskDatabaseUrl(url: URL): string {
  const credentials = url.username ? `${url.username}:***@` : ''
  return `${url.protocol}//${credentials}${url.host}${url.pathname}`
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`
}

function relativePath(path: string): string {
  return relative(repoRoot, path)
}

function fail(message: string, hint?: string): never {
  console.error(`\nSetup failed: ${message}`)

  if (hint) {
    console.error(hint)
  }

  process.exit(1)
}
