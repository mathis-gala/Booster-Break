export type CliArgs = Record<string, string>

export function parseArgs(): CliArgs {
  const values: CliArgs = {}
  const tokens = process.argv.slice(2)

  for (let i = 0; i < tokens.length; i += 1) {
    const arg = tokens[i]

    if (!arg.startsWith('--')) {
      continue
    }

    const [rawKey, rawValue] = arg.slice(2).split('=', 2)

    if (rawValue !== undefined) {
      values[rawKey] = rawValue
      continue
    }

    const nextValue = tokens[i + 1]

    if (!nextValue || nextValue.startsWith('--')) {
      values[rawKey] = 'true'
      continue
    }

    values[rawKey] = nextValue
    i += 1
  }

  return values
}

export function parseYear(input: string, flag: string): string {
  if (!/^\d{4}$/.test(input)) {
    console.error(`Invalid ${flag} value: ${input}. Expected format: YYYY.`)
    process.exit(1)
  }

  return input
}

export function toPositiveInt(input: string, flag: string): number {
  const parsed = Number.parseInt(input, 10)

  if (Number.isNaN(parsed) || parsed < 1) {
    console.error(`Invalid ${flag} value: ${input}. Must be >= 1.`)
    process.exit(1)
  }

  return parsed
}
