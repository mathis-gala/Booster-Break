import type { PokemonSetSummary, SupportedLocale } from '@tcg-collection/shared'
import type { Prisma } from '@prisma/client'
import type { AppPrisma } from '../db/prisma'
import { toSetSummary } from './pokemon-mappers'

type RotationDb = AppPrisma | Prisma.TransactionClient

export interface BoosterRotationRecord {
  id: string
  startsAt: Date
  endsAt: Date
  sourcePollId?: string
  sets: PokemonSetSummary[]
}

export interface BoosterRotationProposalRecord {
  id: string
  sets: PokemonSetSummary[]
  voteCount: number
}

export interface BoosterRotationPollRecord {
  id: string
  votingStartsAt: Date
  votingEndsAt: Date
  targetStartsAt: Date
  targetEndsAt: Date
  selectedProposalId?: string
  closedAt?: Date
  userVoteProposalId?: string
  proposals: BoosterRotationProposalRecord[]
}

export interface BoosterRotationPollDecisionRecord {
  id: string
  selectedProposalId?: string
  closedAt?: Date
  proposals: Array<{
    id: string
    setIds: string[]
    voteCount: number
  }>
}

export interface BoosterRotationProposalPollRecord {
  id: string
  pollId: string
  poll: {
    id: string
    votingEndsAt: Date
    closedAt?: Date
  }
}

interface CreatePollInput {
  votingStartsAt: Date
  votingEndsAt: Date
  targetStartsAt: Date
  targetEndsAt: Date
  proposals: string[][]
}

export class BoosterRotationRepository {
  constructor(private readonly db: RotationDb) {}

  async withRolloverLock<T>(callback: (repository: BoosterRotationRepository) => Promise<T>) {
    if ('$transaction' in this.db) {
      return this.db.$transaction(async (tx) => {
        const repository = new BoosterRotationRepository(tx)

        await repository.lockRollover()

        return callback(repository)
      })
    }

    await this.lockRollover()

    return callback(this)
  }

  async listEligibleSets(
    locale: SupportedLocale,
    limit: number,
  ): Promise<Array<PokemonSetSummary & { boosterImageUrl: string }>> {
    const sets = await this.db.pokemonSet.findMany({
      where: {
        releaseDate: {
          contains: '-',
        },
        boosterImageUrl: {
          not: null,
        },
      },
      orderBy: {
        releaseDate: 'desc',
      },
      take: limit,
    })

    return sets
      .map((set) => toSetSummary(set, locale))
      .filter((set): set is PokemonSetSummary & { boosterImageUrl: string } =>
        Boolean(set.boosterImageUrl),
      )
  }

  async findRotationByPeriod(
    startsAt: Date,
    endsAt: Date,
    locale: SupportedLocale,
  ): Promise<BoosterRotationRecord | undefined> {
    const rotation = await this.db.boosterRotation.findFirst({
      where: {
        startsAt,
        endsAt,
      },
      include: rotationInclude,
    })

    return rotation ? mapRotation(rotation, locale) : undefined
  }

  async findLatestRotationBefore(
    now: Date,
    locale: SupportedLocale,
  ): Promise<BoosterRotationRecord | undefined> {
    const rotation = await this.db.boosterRotation.findFirst({
      where: {
        startsAt: {
          lte: now,
        },
      },
      orderBy: {
        startsAt: 'desc',
      },
      include: rotationInclude,
    })

    return rotation ? mapRotation(rotation, locale) : undefined
  }

  async createRotation(input: {
    startsAt: Date
    endsAt: Date
    sourcePollId?: string
    setIds: string[]
    locale: SupportedLocale
  }): Promise<BoosterRotationRecord> {
    const rotation = await this.db.boosterRotation.create({
      data: {
        id: crypto.randomUUID(),
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        sourcePollId: input.sourcePollId,
        sets: {
          create: input.setIds.map((setId, index) => ({
            setId,
            position: index + 1,
          })),
        },
      },
      include: rotationInclude,
    })

    return mapRotation(rotation, input.locale)
  }

  async findPollByTarget(
    targetStartsAt: Date,
    targetEndsAt: Date,
    locale: SupportedLocale,
    userId?: string,
  ): Promise<BoosterRotationPollRecord | undefined> {
    const poll = await this.db.boosterRotationPoll.findFirst({
      where: {
        targetStartsAt,
        targetEndsAt,
      },
      include: pollInclude,
    })

    if (!poll) {
      return undefined
    }

    const userVote = userId
      ? await this.db.boosterRotationVote.findUnique({
          where: {
            pollId_userId: {
              pollId: poll.id,
              userId,
            },
          },
          select: {
            proposalId: true,
          },
        })
      : undefined

    return mapPoll(poll, locale, userVote?.proposalId)
  }

  async findPollForDecision(
    targetStartsAt: Date,
    targetEndsAt: Date,
  ): Promise<BoosterRotationPollDecisionRecord | undefined> {
    const poll = await this.db.boosterRotationPoll.findFirst({
      where: {
        targetStartsAt,
        targetEndsAt,
      },
      include: decisionPollInclude,
    })

    return poll ? mapDecisionPoll(poll) : undefined
  }

  async createPoll(
    input: CreatePollInput,
    locale: SupportedLocale,
  ): Promise<BoosterRotationPollRecord> {
    const poll = await this.db.boosterRotationPoll.create({
      data: {
        id: crypto.randomUUID(),
        votingStartsAt: input.votingStartsAt,
        votingEndsAt: input.votingEndsAt,
        targetStartsAt: input.targetStartsAt,
        targetEndsAt: input.targetEndsAt,
        proposals: {
          create: input.proposals.map((setIds, proposalIndex) => ({
            id: crypto.randomUUID(),
            position: proposalIndex + 1,
            sets: {
              create: setIds.map((setId, setIndex) => ({
                setId,
                position: setIndex + 1,
              })),
            },
          })),
        },
      },
      include: pollInclude,
    })

    return mapPoll(poll, locale)
  }

  async closePoll(pollId: string, selectedProposalId: string, closedAt: Date): Promise<void> {
    await this.db.boosterRotationPoll.update({
      where: {
        id: pollId,
      },
      data: {
        selectedProposalId,
        closedAt,
      },
    })
  }

  async findProposalPoll(
    proposalId: string,
  ): Promise<BoosterRotationProposalPollRecord | undefined> {
    const proposal = await this.db.boosterRotationProposal.findUnique({
      where: {
        id: proposalId,
      },
      select: {
        id: true,
        pollId: true,
        poll: {
          select: {
            id: true,
            votingEndsAt: true,
            closedAt: true,
          },
        },
      },
    })

    return proposal
      ? {
          id: proposal.id,
          pollId: proposal.pollId,
          poll: {
            id: proposal.poll.id,
            votingEndsAt: proposal.poll.votingEndsAt,
            closedAt: proposal.poll.closedAt ?? undefined,
          },
        }
      : undefined
  }

  async upsertVote(input: {
    pollId: string
    proposalId: string
    userId: string
    now: Date
  }): Promise<void> {
    await this.db.boosterRotationVote.upsert({
      where: {
        pollId_userId: {
          pollId: input.pollId,
          userId: input.userId,
        },
      },
      create: {
        pollId: input.pollId,
        proposalId: input.proposalId,
        userId: input.userId,
        createdAt: input.now,
        updatedAt: input.now,
      },
      update: {
        proposalId: input.proposalId,
        updatedAt: input.now,
      },
    })
  }

  private async lockRollover(): Promise<void> {
    await this.db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('booster-rotation-rollover'))`
  }
}

const rotationInclude = {
  sets: {
    orderBy: {
      position: 'asc',
    },
    include: {
      set: true,
    },
  },
} satisfies Prisma.BoosterRotationInclude

const pollInclude = {
  proposals: {
    orderBy: {
      position: 'asc',
    },
    include: {
      sets: {
        orderBy: {
          position: 'asc',
        },
        include: {
          set: true,
        },
      },
      votes: {
        select: {
          userId: true,
        },
      },
    },
  },
} satisfies Prisma.BoosterRotationPollInclude

const decisionPollInclude = {
  proposals: {
    orderBy: {
      position: 'asc',
    },
    include: {
      sets: {
        orderBy: {
          position: 'asc',
        },
        select: {
          setId: true,
        },
      },
      votes: {
        select: {
          userId: true,
        },
      },
    },
  },
} satisfies Prisma.BoosterRotationPollInclude

const mapRotation = (
  rotation: Prisma.BoosterRotationGetPayload<{ include: typeof rotationInclude }>,
  locale: SupportedLocale,
): BoosterRotationRecord => ({
  id: rotation.id,
  startsAt: rotation.startsAt,
  endsAt: rotation.endsAt,
  sourcePollId: rotation.sourcePollId ?? undefined,
  sets: rotation.sets.map((rotationSet) => toSetSummary(rotationSet.set, locale)),
})

const mapPoll = (
  poll: Prisma.BoosterRotationPollGetPayload<{ include: typeof pollInclude }>,
  locale: SupportedLocale,
  userVoteProposalId?: string,
): BoosterRotationPollRecord => ({
  id: poll.id,
  votingStartsAt: poll.votingStartsAt,
  votingEndsAt: poll.votingEndsAt,
  targetStartsAt: poll.targetStartsAt,
  targetEndsAt: poll.targetEndsAt,
  selectedProposalId: poll.selectedProposalId ?? undefined,
  closedAt: poll.closedAt ?? undefined,
  userVoteProposalId,
  proposals: poll.proposals.map((proposal) => ({
    id: proposal.id,
    sets: proposal.sets.map((proposalSet) => toSetSummary(proposalSet.set, locale)),
    voteCount: proposal.votes.length,
  })),
})

const mapDecisionPoll = (
  poll: Prisma.BoosterRotationPollGetPayload<{ include: typeof decisionPollInclude }>,
): BoosterRotationPollDecisionRecord => ({
  id: poll.id,
  selectedProposalId: poll.selectedProposalId ?? undefined,
  closedAt: poll.closedAt ?? undefined,
  proposals: poll.proposals.map((proposal) => ({
    id: proposal.id,
    setIds: proposal.sets.map((proposalSet) => proposalSet.setId),
    voteCount: proposal.votes.length,
  })),
})
