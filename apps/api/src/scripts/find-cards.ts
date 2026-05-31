import { prisma } from '../db/prisma'
import type { Prisma } from '@prisma/client'
import { parseArgs, parseYear, toPositiveInt } from './script-utils'

const args = parseArgs()
const query = args.query?.trim()
const year = args.year ? parseYear(args.year, '--year') : undefined

if (!query) {
  console.error(
    'Usage: bun src/scripts/find-cards.ts --query <name> [--setId <set-id>] [--year <yyyy>] [--limit <n>]',
  )
  process.exit(1)
}

const limit = args.limit ? toPositiveInt(args.limit, '--limit') : 20
const where: Prisma.PokemonCardWhereInput = {
  OR: [
    {
      name: { contains: query, mode: 'insensitive' },
    },
    {
      nameEn: { contains: query, mode: 'insensitive' },
    },
    {
      nameFr: { contains: query, mode: 'insensitive' },
    },
  ],
}

if (args.setId) {
  where.setId = args.setId
}

if (year) {
  where.set = {
    releaseDate: {
      startsWith: `${year}-`,
    },
  }
}

const normalizedLimit = Math.min(limit, 100)

const cards = await prisma.pokemonCard.findMany({
  where,
  select: {
    id: true,
    localId: true,
    name: true,
    nameEn: true,
    nameFr: true,
    rarity: true,
    category: true,
    setId: true,
    imageSmall: true,
    imageLarge: true,
    set: {
      select: {
        name: true,
        nameEn: true,
        nameFr: true,
        releaseDate: true,
      },
    },
  },
  take: normalizedLimit,
  orderBy: [
    {
      name: 'asc',
    },
    {
      localId: 'asc',
    },
  ],
})

console.log(
  JSON.stringify(
    cards.map((card) => ({
      id: card.id,
      setId: card.setId,
      setName: card.set.name,
      setNameEn: card.set.nameEn,
      setNameFr: card.set.nameFr,
      releaseDate: card.set.releaseDate,
      number: card.localId,
      name: card.name,
      nameEn: card.nameEn,
      nameFr: card.nameFr,
      rarity: card.rarity,
      type: card.category,
      imageSmall: card.imageSmall,
      imageLarge: card.imageLarge,
    })),
    null,
    2,
  ),
)

await prisma.$disconnect()
