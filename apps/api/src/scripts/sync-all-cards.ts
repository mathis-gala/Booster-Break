import type { SupportedLocale } from '@tcg-collection/shared'
import { prisma } from '../db/prisma'
import { PokemonRepository } from '../pokemon/pokemon-repository'
import { getSetSeriesName, TcgDexClient } from '../pokemon/tcgdex-client'
import { parseArgs, parseYear, toPositiveInt } from './script-utils'

const args = parseArgs()
const repository = new PokemonRepository(prisma)
const pokemonClient = new TcgDexClient('en')
const localizedClients: Record<SupportedLocale, TcgDexClient> = {
  en: pokemonClient,
  fr: new TcgDexClient('fr'),
}
const syncedAt = new Date().toISOString()
const sets = await listSetsToSync()
let syncedSets = 0
let syncedCards = 0

for (const set of sets) {
  const localizedSet = await localizedClients.fr.getSetById(set.id)

  await repository.upsertSet(set, syncedAt, undefined, {
    en: {
      name: set.name,
      series: getSetSeriesName(set),
    },
    fr: localizedSet
      ? {
          name: localizedSet.name,
          series: getSetSeriesName(localizedSet),
        }
      : undefined,
  })

  const cards = await pokemonClient.getCardsBySet(set)
  const localizedCards = await localizedClients.fr.getCardsByIds(cards.map((card) => card.id))
  const localizedCardNames = new Map(
    localizedCards.map((card) => [
      card.id,
      {
        fr: card.name,
      },
    ]),
  )

  await repository.replaceSetCards(set.id, cards, syncedAt, localizedCardNames)

  syncedSets += 1
  syncedCards += cards.length

  console.log(`${syncedSets}/${sets.length} synced ${set.id} (${set.name}) - ${cards.length} cards`)
}

console.log(
  JSON.stringify(
    {
      ok: true,
      sets: syncedSets,
      cards: syncedCards,
      syncedAt,
    },
    null,
    2,
  ),
)

await prisma.$disconnect()

async function listSetsToSync() {
  if (args.setId) {
    const set = await pokemonClient.getSetById(args.setId)

    if (!set) {
      console.error(`Set not found: ${args.setId}`)
      process.exit(1)
    }

    return [set]
  }

  const fromYear = args.fromYear ? parseYear(args.fromYear, '--fromYear') : undefined
  const toYear = args.toYear ? parseYear(args.toYear, '--toYear') : undefined
  const limit = args.limit ? toPositiveInt(args.limit, '--limit') : undefined

  let setsToSync = await pokemonClient.getAllSets()

  if (fromYear) {
    setsToSync = setsToSync.filter((set) => set.releaseDate >= `${fromYear}-01-01`)
  }

  if (toYear) {
    setsToSync = setsToSync.filter((set) => set.releaseDate <= `${toYear}-12-31`)
  }

  return limit ? setsToSync.slice(0, limit) : setsToSync
}
