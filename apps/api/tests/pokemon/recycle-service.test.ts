import { describe, expect, test } from 'bun:test'
import type { PokemonCardSummary } from '@tcg-collection/shared'
import { RECYCLE_COST } from '@tcg-collection/shared'
import { isPokemonServiceError, PokemonService } from '../../src/pokemon/pokemon-service'
import type { PokemonRepository } from '../../src/pokemon/pokemon-repository'
import type { AuthUser } from '../../src/auth/types'

const user: AuthUser = { id: 'user-1', pseudo: 'ash' }

type OwnedRow = { cardId: string; finish: string; quantity: number; rarity: string | null }

interface FakeRepoState {
  owned: OwnedRow[]
  catalog: PokemonCardSummary[]
  recycleCalls: Array<{
    consumed: Array<{ cardId: string; finish: string; quantity: number }>
    rewards: PokemonCardSummary[]
  }>
}

const makeService = (state: FakeRepoState) => {
  const repository = {
    async listOwnedRecycleRows(_userId: string, cardIds: string[]) {
      return state.owned.filter((row) => cardIds.includes(row.cardId))
    },
    async listRecycleRewardCandidates() {
      return state.catalog
    },
    async recycleCards(
      _userId: string,
      consumed: Array<{ cardId: string; finish: string; quantity: number }>,
      rewards: PokemonCardSummary[],
    ) {
      state.recycleCalls.push({ consumed, rewards })
      const ownedIds = new Set(state.owned.map((row) => row.cardId))

      return {
        newCardIds: rewards.filter((reward) => !ownedIds.has(reward.id)).map((reward) => reward.id),
      }
    },
  } as unknown as PokemonRepository

  return new PokemonService({
    authService: {} as never,
    localizedPokemonClients: {} as never,
    pokemonClient: {} as never,
    pokemonRepository: repository,
    sealedClient: {} as never,
  })
}

const card = (id: string, rarity: string): PokemonCardSummary => ({
  id,
  setId: 'set-1',
  name: id,
  number: id,
  rarity,
  finishes: rarity === 'Common' || rarity === 'Uncommon' ? ['normal'] : ['holo'],
})

const catalog = [
  card('c1', 'Common'),
  card('c2', 'Common'),
  card('u1', 'Uncommon'),
  card('r1', 'Rare'),
]

describe('PokemonService.recycleCards', () => {
  test('crafts one card from a full batch of the same rarity', async () => {
    const state: FakeRepoState = {
      owned: [{ cardId: 'c1', finish: 'normal', quantity: RECYCLE_COST, rarity: 'Common' }],
      catalog,
      recycleCalls: [],
    }
    const service = makeService(state)

    const result = await service.recycleCards(user, {
      items: [{ cardId: 'c1', finish: 'normal', quantity: RECYCLE_COST }],
    })

    if (isPokemonServiceError(result)) {
      throw new Error(`expected success, got ${result.error}`)
    }

    expect(result.recycledCount).toBe(RECYCLE_COST)
    expect(result.rewardCount).toBe(1)
    expect(result.awardedCards).toHaveLength(1)
    expect(result.awardedCards.every((card) => typeof card.isNew === 'boolean')).toBe(true)
    expect(state.recycleCalls).toHaveLength(1)
    expect(state.recycleCalls[0]?.consumed).toEqual([
      { cardId: 'c1', finish: 'normal', quantity: RECYCLE_COST },
    ])
  })

  test('recycles several rarities at once (auto sweep)', async () => {
    const state: FakeRepoState = {
      owned: [
        { cardId: 'c1', finish: 'normal', quantity: RECYCLE_COST, rarity: 'Common' },
        { cardId: 'u1', finish: 'normal', quantity: RECYCLE_COST, rarity: 'Uncommon' },
      ],
      catalog,
      recycleCalls: [],
    }
    const service = makeService(state)

    const result = await service.recycleCards(user, {
      items: [
        { cardId: 'c1', finish: 'normal', quantity: RECYCLE_COST },
        { cardId: 'u1', finish: 'normal', quantity: RECYCLE_COST },
      ],
    })

    if (isPokemonServiceError(result)) {
      throw new Error(`expected success, got ${result.error}`)
    }

    expect(result.rewardCount).toBe(2)
    expect(result.recycledCount).toBe(RECYCLE_COST * 2)
  })

  test('rejects when the user does not own enough copies', async () => {
    const state: FakeRepoState = {
      owned: [{ cardId: 'c1', finish: 'normal', quantity: 1, rarity: 'Common' }],
      catalog,
      recycleCalls: [],
    }
    const service = makeService(state)

    const result = await service.recycleCards(user, {
      items: [{ cardId: 'c1', finish: 'normal', quantity: 2 }],
    })

    expect(isPokemonServiceError(result) && result.error).toBe('recycle_invalid')
    expect(state.recycleCalls).toHaveLength(0)
  })

  // Only meaningful when a batch needs more than one card; with RECYCLE_COST=1
  // every valid selection already yields a reward.
  test.skipIf(RECYCLE_COST < 2)('rejects when fewer than a full batch is selected', async () => {
    const state: FakeRepoState = {
      owned: [{ cardId: 'c1', finish: 'normal', quantity: RECYCLE_COST - 1, rarity: 'Common' }],
      catalog,
      recycleCalls: [],
    }
    const service = makeService(state)

    const result = await service.recycleCards(user, {
      items: [{ cardId: 'c1', finish: 'normal', quantity: RECYCLE_COST - 1 }],
    })

    expect(isPokemonServiceError(result) && result.error).toBe('recycle_nothing')
    expect(state.recycleCalls).toHaveLength(0)
  })
})
