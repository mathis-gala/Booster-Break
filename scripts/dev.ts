import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

startPostgres()

const processes = [
  Bun.spawn(['bun', 'run', 'dev:api'], {
    cwd: repoRoot,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  }),
  Bun.spawn(['bun', 'run', 'dev:web'], {
    cwd: repoRoot,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  }),
]

let stopping = false

function stop() {
  if (stopping) {
    return
  }

  stopping = true
  for (const process of processes) {
    process.kill()
  }
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)

const exitCode = await Promise.race(processes.map((process) => process.exited))
stop()
process.exit(exitCode)

function startPostgres() {
  const result = spawnSync(
    'docker',
    ['compose', '-f', 'docker-compose.dev.yml', 'up', '--wait', '--wait-timeout', '90', 'postgres'],
    { cwd: repoRoot, stdio: 'inherit' },
  )

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
