import { describe, expect, test } from 'bun:test'
import type { PackRotationResponse, PokemonSetSummary } from '@tcg-collection/shared'
import type { AuthService } from '../../src/auth/auth-service'
import type { BoosterRotationRepository } from '../../src/pokemon/booster-rotation-repository'
import type {
  BoosterRotationPollDecisionRecord,
  BoosterRotationPollRecord,
  BoosterRotationRecord,
} from '../../src/pokemon/booster-rotation-repository'
import { BoosterRotationService } from '../../src/pokemon/booster-rotation-service'
import { PokemonService } from '../../src/pokemon/pokemon-service'

const rotationConfig = {
  availableCount: 3,
  proposalCount: 3,
  cadenceUnit: 'day' as const,
  cadenceValue: 7,
  timeZone: 'Europe/Paris',
  anchorLocalDate: '2026-06-29',
}

describe('BoosterRotationService', () => {
  test('generates proposals that exclude active boosters', async () => {
    const repository = new MemoryBoosterRotationRepository(makeSets(8))
    const service = makeService(repository, sequenceRandom([0, 0, 0]))
    const rotation = await service.getRotation({
      locale: 'fr',
      now: new Date('2026-07-02T12:00:00.000Z'),
    })

    expect('error' in rotation).toBe(false)
    const response = rotation as PackRotationResponse
    const activeSetIds = new Set(response.active.sets.map((set) => set.id))

    for (const proposal of response.poll.proposals) {
      expect(proposal.sets.some((set) => activeSetIds.has(set.id))).toBe(false)
    }
  })

  test('generates three boosters per proposal without duplicates', async () => {
    const repository = new MemoryBoosterRotationRepository(makeSets(8))
    const service = makeService(repository, sequenceRandom([0, 0, 0]))
    const rotation = await service.getRotation({
      locale: 'fr',
      now: new Date('2026-07-02T12:00:00.000Z'),
    })

    expect('error' in rotation).toBe(false)
    const response = rotation as PackRotationResponse

    for (const proposal of response.poll.proposals) {
      const setIds = proposal.sets.map((set) => set.id)

      expect(setIds).toHaveLength(3)
      expect(new Set(setIds).size).toBe(3)
    }
  })

  test('keeps one vote per user and allows changing it before closing', async () => {
    const repository = new MemoryBoosterRotationRepository(makeSets(8))
    const service = makeService(repository, sequenceRandom([0, 0, 0, 0.99, 0.99, 0.99]))
    const rotation = (await service.getRotation({
      locale: 'fr',
      now: new Date('2026-07-02T12:00:00.000Z'),
      userId: 'user-1',
    })) as PackRotationResponse
    const firstProposalId = rotation.poll.proposals[0]!.id
    const secondProposalId = rotation.poll.proposals[1]!.id

    const firstVote = (await service.vote({
      locale: 'fr',
      now: new Date('2026-07-02T12:00:00.000Z'),
      proposalId: firstProposalId,
      userId: 'user-1',
    })) as PackRotationResponse

    expect(firstVote.poll.userVoteProposalId).toBe(firstProposalId)
    expect(
      firstVote.poll.proposals.find((proposal) => proposal.id === firstProposalId)?.voteCount,
    ).toBe(1)

    const changedVote = (await service.vote({
      locale: 'fr',
      now: new Date('2026-07-02T12:00:00.000Z'),
      proposalId: secondProposalId,
      userId: 'user-1',
    })) as PackRotationResponse

    expect(changedVote.poll.userVoteProposalId).toBe(secondProposalId)
    expect(
      changedVote.poll.proposals.find((proposal) => proposal.id === firstProposalId)?.voteCount,
    ).toBe(0)
    expect(
      changedVote.poll.proposals.find((proposal) => proposal.id === secondProposalId)?.voteCount,
    ).toBe(1)
  })

  test('rollover chooses the most voted proposal', async () => {
    const repository = new MemoryBoosterRotationRepository(makeSets(9))
    const service = makeService(repository, sequenceRandom([0, 0, 0, 0, 0, 0, 0.99, 0.99, 0.99]))
    const rotation = (await service.getRotation({
      locale: 'fr',
      now: new Date('2026-07-02T12:00:00.000Z'),
    })) as PackRotationResponse
    const winner = rotation.poll.proposals[1]!

    await service.vote({
      locale: 'fr',
      now: new Date('2026-07-02T12:00:00.000Z'),
      proposalId: winner.id,
      userId: 'user-1',
    })
    await service.vote({
      locale: 'fr',
      now: new Date('2026-07-02T12:00:00.000Z'),
      proposalId: winner.id,
      userId: 'user-2',
    })

    const nextRotation = (await service.getRotation({
      locale: 'fr',
      now: new Date('2026-07-07T12:00:00.000Z'),
    })) as PackRotationResponse

    expect(nextRotation.active.sets.map((set) => set.id)).toEqual(winner.sets.map((set) => set.id))
  })

  test('rollover resolves ties with the injected random function', async () => {
    const repository = new MemoryBoosterRotationRepository(makeSets(9))
    repository.seedRotation({
      id: 'rotation-previous',
      startsAt: new Date('2026-06-28T22:00:00.000Z'),
      endsAt: new Date('2026-07-05T22:00:00.000Z'),
      sets: ['set-1', 'set-2', 'set-3'],
    })
    repository.seedPoll({
      id: 'poll-current',
      votingStartsAt: new Date('2026-06-28T22:00:00.000Z'),
      votingEndsAt: new Date('2026-07-05T22:00:00.000Z'),
      targetStartsAt: new Date('2026-07-05T22:00:00.000Z'),
      targetEndsAt: new Date('2026-07-12T22:00:00.000Z'),
      proposals: [
        { id: 'proposal-1', setIds: ['set-4', 'set-5', 'set-6'] },
        { id: 'proposal-2', setIds: ['set-7', 'set-8', 'set-9'] },
      ],
      votes: [
        { userId: 'user-1', proposalId: 'proposal-1' },
        { userId: 'user-2', proposalId: 'proposal-2' },
      ],
    })
    const service = makeService(repository, () => 0.99)

    const rotation = (await service.getRotation({
      locale: 'fr',
      now: new Date('2026-07-07T12:00:00.000Z'),
    })) as PackRotationResponse

    expect(rotation.active.sets.map((set) => set.id)).toEqual(['set-7', 'set-8', 'set-9'])
  })

  test('rollover resolves an unvoted poll with the injected random function', async () => {
    const repository = new MemoryBoosterRotationRepository(makeSets(9))
    repository.seedRotation({
      id: 'rotation-previous',
      startsAt: new Date('2026-06-28T22:00:00.000Z'),
      endsAt: new Date('2026-07-05T22:00:00.000Z'),
      sets: ['set-1', 'set-2', 'set-3'],
    })
    repository.seedPoll({
      id: 'poll-current',
      votingStartsAt: new Date('2026-06-28T22:00:00.000Z'),
      votingEndsAt: new Date('2026-07-05T22:00:00.000Z'),
      targetStartsAt: new Date('2026-07-05T22:00:00.000Z'),
      targetEndsAt: new Date('2026-07-12T22:00:00.000Z'),
      proposals: [
        { id: 'proposal-1', setIds: ['set-4', 'set-5', 'set-6'] },
        { id: 'proposal-2', setIds: ['set-7', 'set-8', 'set-9'] },
      ],
    })
    const service = makeService(repository, () => 0)

    const rotation = (await service.getRotation({
      locale: 'fr',
      now: new Date('2026-07-07T12:00:00.000Z'),
    })) as PackRotationResponse

    expect(rotation.active.sets.map((set) => set.id)).toEqual(['set-4', 'set-5', 'set-6'])
  })

  test('openPack rejects a booster outside the active rotation', async () => {
    const service = new PokemonService({
      authService: {} as unknown as AuthService,
      boosterRotationService: {
        getRotation: async () => ({
          active: {
            id: 'rotation-1',
            startsAt: '2026-06-28T22:00:00.000Z',
            endsAt: '2026-07-05T22:00:00.000Z',
            sets: makeSets(3),
          },
          poll: {
            id: 'poll-1',
            votingStartsAt: '2026-06-28T22:00:00.000Z',
            votingEndsAt: '2026-07-05T22:00:00.000Z',
            targetStartsAt: '2026-07-05T22:00:00.000Z',
            targetEndsAt: '2026-07-12T22:00:00.000Z',
            proposals: [],
          },
        }),
      } as unknown as BoosterRotationService,
      localizedPokemonClients: {},
      pokemonClient: {},
      pokemonRepository: {
        listSets: async () => makeSets(4),
      },
      sealedClient: {},
    } as ConstructorParameters<typeof PokemonService>[0])

    const result = await service.openPack(
      { id: 'user-1', pseudo: 'user-1' },
      { setId: 'set-4', locale: 'fr' },
    )

    expect(result).toEqual({
      error: 'pack_not_in_rotation',
      message: 'This booster is not available in the current rotation.',
    })
  })
})

class MemoryBoosterRotationRepository {
  private readonly setById: Map<string, PokemonSetSummary>
  private readonly rotations: BoosterRotationRecord[] = []
  private readonly polls: MemoryPoll[] = []
  private readonly votes = new Map<string, string>()
  private nextRotationIndex = 1
  private nextPollIndex = 1

  constructor(private readonly sets: Array<PokemonSetSummary & { boosterImageUrl: string }>) {
    this.setById = new Map(sets.map((set) => [set.id, set]))
  }

  async withRolloverLock<T>(callback: (repository: BoosterRotationRepository) => Promise<T>) {
    return callback(this as unknown as BoosterRotationRepository)
  }

  async listEligibleSets() {
    return this.sets
  }

  async findRotationByPeriod(startsAt: Date, endsAt: Date) {
    return this.rotations.find(
      (rotation) =>
        rotation.startsAt.getTime() === startsAt.getTime() &&
        rotation.endsAt.getTime() === endsAt.getTime(),
    )
  }

  async findLatestRotationBefore(now: Date) {
    return [...this.rotations]
      .filter((rotation) => rotation.startsAt.getTime() <= now.getTime())
      .sort((first, second) => second.startsAt.getTime() - first.startsAt.getTime())[0]
  }

  async createRotation(input: {
    startsAt: Date
    endsAt: Date
    sourcePollId?: string
    setIds: string[]
  }) {
    const rotation: BoosterRotationRecord = {
      id: `rotation-${this.nextRotationIndex}`,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      sourcePollId: input.sourcePollId,
      sets: input.setIds.map((setId) => this.getSet(setId)),
    }

    this.nextRotationIndex += 1
    this.rotations.push(rotation)

    return rotation
  }

  async findPollByTarget(
    targetStartsAt: Date,
    targetEndsAt: Date,
    _locale: 'fr' | 'en',
    userId?: string,
  ): Promise<BoosterRotationPollRecord | undefined> {
    const poll = this.polls.find(
      (candidate) =>
        candidate.targetStartsAt.getTime() === targetStartsAt.getTime() &&
        candidate.targetEndsAt.getTime() === targetEndsAt.getTime(),
    )

    return poll ? this.mapPoll(poll, userId) : undefined
  }

  async findPollForDecision(
    targetStartsAt: Date,
    targetEndsAt: Date,
  ): Promise<BoosterRotationPollDecisionRecord | undefined> {
    const poll = this.polls.find(
      (candidate) =>
        candidate.targetStartsAt.getTime() === targetStartsAt.getTime() &&
        candidate.targetEndsAt.getTime() === targetEndsAt.getTime(),
    )

    return poll
      ? {
          id: poll.id,
          selectedProposalId: poll.selectedProposalId,
          closedAt: poll.closedAt,
          proposals: poll.proposals.map((proposal) => ({
            id: proposal.id,
            setIds: proposal.setIds,
            voteCount: this.countVotes(proposal.id),
          })),
        }
      : undefined
  }

  async createPoll(input: {
    votingStartsAt: Date
    votingEndsAt: Date
    targetStartsAt: Date
    targetEndsAt: Date
    proposals: string[][]
  }) {
    const poll: MemoryPoll = {
      id: `poll-${this.nextPollIndex}`,
      votingStartsAt: input.votingStartsAt,
      votingEndsAt: input.votingEndsAt,
      targetStartsAt: input.targetStartsAt,
      targetEndsAt: input.targetEndsAt,
      proposals: input.proposals.map((setIds, index) => ({
        id: `proposal-${this.nextPollIndex}-${index + 1}`,
        setIds,
      })),
    }

    this.nextPollIndex += 1
    this.polls.push(poll)

    return this.mapPoll(poll)
  }

  async closePoll(pollId: string, selectedProposalId: string, closedAt: Date) {
    const poll = this.polls.find((candidate) => candidate.id === pollId)

    if (poll) {
      poll.selectedProposalId = selectedProposalId
      poll.closedAt = closedAt
    }
  }

  async findProposalPoll(proposalId: string) {
    const poll = this.polls.find((candidate) =>
      candidate.proposals.some((proposal) => proposal.id === proposalId),
    )

    return poll
      ? {
          id: proposalId,
          pollId: poll.id,
          poll: {
            id: poll.id,
            votingEndsAt: poll.votingEndsAt,
            closedAt: poll.closedAt,
          },
        }
      : undefined
  }

  async upsertVote(input: { pollId: string; proposalId: string; userId: string }) {
    this.votes.set(`${input.pollId}:${input.userId}`, input.proposalId)
  }

  seedRotation(input: { id: string; startsAt: Date; endsAt: Date; sets: string[] }) {
    this.rotations.push({
      id: input.id,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      sets: input.sets.map((setId) => this.getSet(setId)),
    })
  }

  seedPoll(input: {
    id: string
    votingStartsAt: Date
    votingEndsAt: Date
    targetStartsAt: Date
    targetEndsAt: Date
    proposals: Array<{ id: string; setIds: string[] }>
    votes?: Array<{ userId: string; proposalId: string }>
  }) {
    this.polls.push({
      id: input.id,
      votingStartsAt: input.votingStartsAt,
      votingEndsAt: input.votingEndsAt,
      targetStartsAt: input.targetStartsAt,
      targetEndsAt: input.targetEndsAt,
      proposals: input.proposals,
    })

    for (const vote of input.votes ?? []) {
      this.votes.set(`${input.id}:${vote.userId}`, vote.proposalId)
    }
  }

  private mapPoll(poll: MemoryPoll, userId?: string): BoosterRotationPollRecord {
    return {
      id: poll.id,
      votingStartsAt: poll.votingStartsAt,
      votingEndsAt: poll.votingEndsAt,
      targetStartsAt: poll.targetStartsAt,
      targetEndsAt: poll.targetEndsAt,
      selectedProposalId: poll.selectedProposalId,
      closedAt: poll.closedAt,
      userVoteProposalId: userId ? this.votes.get(`${poll.id}:${userId}`) : undefined,
      proposals: poll.proposals.map((proposal) => ({
        id: proposal.id,
        sets: proposal.setIds.map((setId) => this.getSet(setId)),
        voteCount: this.countVotes(proposal.id),
      })),
    }
  }

  private countVotes(proposalId: string): number {
    return [...this.votes.values()].filter((voteProposalId) => voteProposalId === proposalId).length
  }

  private getSet(setId: string): PokemonSetSummary {
    const set = this.setById.get(setId)

    if (!set) {
      throw new Error(`Unknown set ${setId}`)
    }

    return set
  }
}

interface MemoryPoll {
  id: string
  votingStartsAt: Date
  votingEndsAt: Date
  targetStartsAt: Date
  targetEndsAt: Date
  selectedProposalId?: string
  closedAt?: Date
  proposals: Array<{
    id: string
    setIds: string[]
  }>
}

const makeService = (repository: MemoryBoosterRotationRepository, random: () => number) =>
  new BoosterRotationService({
    config: rotationConfig,
    repository: repository as unknown as BoosterRotationRepository,
    random,
  })

const sequenceRandom = (values: number[]) => {
  let index = 0

  return () => values[index++] ?? 0
}

const makeSets = (count: number): Array<PokemonSetSummary & { boosterImageUrl: string }> =>
  Array.from({ length: count }, (_, index) => {
    const setIndex = index + 1

    return {
      id: `set-${setIndex}`,
      name: `Set ${setIndex}`,
      series: 'Series',
      total: 100,
      releaseDate: `2026-06-${String(setIndex).padStart(2, '0')}`,
      boosterImageUrl: `https://example.com/set-${setIndex}.png`,
    }
  })
