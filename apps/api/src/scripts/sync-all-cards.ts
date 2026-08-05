import type { SupportedLocale } from '@tcg-collection/shared'
import { prisma } from '../db/prisma'
import { PokemonCatalogSyncService } from '../pokemon/pokemon-catalog-sync-service'
import { PokemonRepository } from '../pokemon/pokemon-repository'
import { TcgDexClient } from '../pokemon/tcgdex-client'
import { getSwshGalleryParentSetId, getSwshGallerySetId } from '../pokemon/swsh-gallery'
import { parseArgs, parseYear, toPositiveInt } from './script-utils'

const args = parseArgs()
const repository = new PokemonRepository(prisma)
const pokemonClient = new TcgDexClient('en')
const localizedClients: Record<SupportedLocale, TcgDexClient> = {
  en: pokemonClient,
  fr: new TcgDexClient('fr'),
}
const catalogSyncService = new PokemonCatalogSyncService({
  pokemonClient,
  localizedPokemonClients: localizedClients,
  pokemonRepository: repository,
})
const syncedAt = new Date().toISOString()
const sets = await listSetsToSync()
let syncedSets = 0
let syncedCards = 0

for (const set of sets) {
  const gallerySetId = getSwshGallerySetId(set.id)
  const gallerySet = gallerySetId ? await pokemonClient.getSetById(gallerySetId) : undefined
  const result = await catalogSyncService.syncSet(set, {
    syncedAt,
    supplementalSets: gallerySet ? [gallerySet] : [],
  })

  syncedSets += 1
  syncedCards += result.cards

  console.log(`${syncedSets}/${sets.length} synced ${set.id} (${set.name}) - ${result.cards} cards`)
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
    const setId = getSwshGalleryParentSetId(args.setId) ?? args.setId
    const set = await pokemonClient.getSetById(setId)

    if (!set) {
      console.error(`Set not found: ${setId}`)
      process.exit(1)
    }

    return [set]
  }

  const fromYear = args.fromYear ? parseYear(args.fromYear, '--fromYear') : undefined
  const toYear = args.toYear ? parseYear(args.toYear, '--toYear') : undefined
  const limit = args.limit ? toPositiveInt(args.limit, '--limit') : undefined

  let setsToSync = (await pokemonClient.getAllSets()).filter(
    (set) => !getSwshGalleryParentSetId(set.id),
  )

  if (fromYear) {
    setsToSync = setsToSync.filter((set) => set.releaseDate >= `${fromYear}-01-01`)
  }

  if (toYear) {
    setsToSync = setsToSync.filter((set) => set.releaseDate <= `${toYear}-12-31`)
  }

  return limit ? setsToSync.slice(0, limit) : setsToSync
}
