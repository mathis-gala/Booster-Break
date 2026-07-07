import { DEFAULT_LOCALE } from '@tcg-collection/shared'
import { prisma } from '../db/prisma'
import { drawPokemonPackCards } from '../pokemon/pack-draft'
import { PokemonRepository } from '../pokemon/pokemon-repository'
import { parseArgs, toPositiveInt } from './script-utils'

const args = parseArgs()
const userId = args.userId
const pseudo = args.pseudo
const setId = args.setId
const count = args.count ? toPositiveInt(args.count, '--count') : 1
const locale = DEFAULT_LOCALE

if (!userId && !pseudo) {
  console.error('Missing required --userId or --pseudo')
  process.exit(1)
}

const user = userId
  ? await prisma.user.findUnique({ where: { id: userId } })
  : await prisma.user.findFirst({ where: { pseudo } })

if (!user) {
  console.error(`User not found: ${userId ?? pseudo}`)
  process.exit(1)
}

const repository = new PokemonRepository(prisma)
const resolvedSetId = setId ?? (await repository.listSets(locale))[0]?.id

if (!resolvedSetId) {
  console.error('No Pokemon sets are synced. Run `bun sync-all-cards` first.')
  process.exit(1)
}

const set = await repository.getSet(resolvedSetId, locale)

if (!set) {
  console.error(`Set not found: ${resolvedSetId}`)
  process.exit(1)
}

const allCards = await repository.listCards(resolvedSetId, locale)

if (allCards.length === 0) {
  console.error(`No cards available for set: ${resolvedSetId}`)
  process.exit(1)
}

let openedCount = 0
let drawnCards = 0
let newCards = 0

for (let i = 0; i < count; i += 1) {
  const { cards } = drawPokemonPackCards(allCards)

  if (cards.length === 0) {
    continue
  }

  // Clearing the cooldown anchor bypasses the per-user open throttle for debugging.
  await prisma.user.update({
    where: { id: user.id },
    data: { boosterCooldownAnchor: null },
  })

  const { newCardIds } = await repository.recordPackOpening(user.id, set.id, cards)

  openedCount += 1
  drawnCards += cards.length
  newCards += newCardIds.length
}

console.log(
  JSON.stringify(
    {
      user: user.pseudo,
      userId: user.id,
      setId: set.id,
      setName: set.name,
      requested: count,
      opened: openedCount,
      drawnCards,
      newCards,
    },
    null,
    2,
  ),
)

await prisma.$disconnect()
