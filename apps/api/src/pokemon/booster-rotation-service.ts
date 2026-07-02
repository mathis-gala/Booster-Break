import type {
  PackRotationResponse,
  PokemonSetSummary,
  SupportedLocale,
} from '@tcg-collection/shared'
import { SYNCED_BOOSTER_LIMIT } from './pokemon-config'
import { getBoosterRotationPeriod, getNextBoosterRotationPeriod } from './booster-rotation-calendar'
import type {
  BoosterRotationConfig,
  BoosterRotationGetInput,
  BoosterRotationPeriod,
  BoosterRotationResult,
  BoosterRotationServiceError,
  BoosterRotationVoteInput,
} from './booster-rotation-types'
import type {
  BoosterRotationRepository,
  BoosterRotationPollDecisionRecord,
  BoosterRotationPollRecord,
  BoosterRotationRecord,
} from './booster-rotation-repository'

interface BoosterRotationServiceOptions {
  config: BoosterRotationConfig
  repository: BoosterRotationRepository
  random?: () => number
  ensurePokemonDataAvailable?: (locale: SupportedLocale, minimumSetCount: number) => Promise<void>
}

type EligibleSet = PokemonSetSummary & { boosterImageUrl: string }

interface RotationState {
  active: BoosterRotationRecord
  poll: BoosterRotationPollRecord
}

export class BoosterRotationService {
  private readonly random: () => number

  constructor(private readonly options: BoosterRotationServiceOptions) {
    this.random = options.random ?? Math.random
  }

  async getRotation(input: BoosterRotationGetInput): Promise<BoosterRotationResult> {
    const now = input.now ?? new Date()

    await this.ensurePokemonDataAvailable(input.locale)

    return this.options.repository.withRolloverLock(async (repository) => {
      const state = await this.ensureState(repository, input.locale, now, input.userId)

      return isRotationError(state) ? state : toPackRotationResponse(state)
    })
  }

  async vote(input: BoosterRotationVoteInput): Promise<BoosterRotationResult> {
    const now = input.now ?? new Date()

    await this.ensurePokemonDataAvailable(input.locale)

    return this.options.repository.withRolloverLock(async (repository) => {
      const state = await this.ensureState(repository, input.locale, now, input.userId)

      if (isRotationError(state)) {
        return state
      }

      const proposal = await repository.findProposalPoll(input.proposalId)

      if (!proposal) {
        return proposalNotFound()
      }

      const isCurrentPollProposal = state.poll.proposals.some(
        (candidate) => candidate.id === input.proposalId,
      )

      if (
        !isCurrentPollProposal ||
        proposal.poll.closedAt ||
        proposal.poll.votingEndsAt.getTime() <= now.getTime()
      ) {
        return voteClosed()
      }

      await repository.upsertVote({
        pollId: state.poll.id,
        proposalId: input.proposalId,
        userId: input.userId,
        now,
      })

      const poll = await repository.findPollByTarget(
        state.poll.targetStartsAt,
        state.poll.targetEndsAt,
        input.locale,
        input.userId,
      )

      return toPackRotationResponse({
        active: state.active,
        poll: poll ?? state.poll,
      })
    })
  }

  private async ensurePokemonDataAvailable(locale: SupportedLocale): Promise<void> {
    await this.options.ensurePokemonDataAvailable?.(locale, this.options.config.availableCount * 2)
  }

  private async ensureState(
    repository: BoosterRotationRepository,
    locale: SupportedLocale,
    now: Date,
    userId?: string,
  ): Promise<RotationState | BoosterRotationServiceError> {
    const currentPeriod = getBoosterRotationPeriod(now, this.options.config)
    const active = await this.ensureActiveRotation(repository, locale, currentPeriod, now)

    if (isRotationError(active)) {
      return active
    }

    const nextPeriod = getNextBoosterRotationPeriod(currentPeriod, this.options.config)
    const existingPoll = await repository.findPollByTarget(
      nextPeriod.startsAt,
      nextPeriod.endsAt,
      locale,
      userId,
    )

    if (existingPoll) {
      return {
        active,
        poll: existingPoll,
      }
    }

    const createdPoll = await this.createPollForNextRotation(repository, locale, active, nextPeriod)

    return isRotationError(createdPoll)
      ? createdPoll
      : {
          active,
          poll: createdPoll,
        }
  }

  private async ensureActiveRotation(
    repository: BoosterRotationRepository,
    locale: SupportedLocale,
    currentPeriod: BoosterRotationPeriod,
    now: Date,
  ): Promise<BoosterRotationRecord | BoosterRotationServiceError> {
    const existingCurrentRotation = await repository.findRotationByPeriod(
      currentPeriod.startsAt,
      currentPeriod.endsAt,
      locale,
    )

    if (existingCurrentRotation) {
      return existingCurrentRotation
    }

    let latestRotation = await repository.findLatestRotationBefore(now, locale)

    if (!latestRotation) {
      return this.createFallbackRotation(repository, locale, currentPeriod, [])
    }

    let cursorPeriod = getNextBoosterRotationPeriod(
      getBoosterRotationPeriod(
        new Date(latestRotation.startsAt.getTime() + 1000),
        this.options.config,
      ),
      this.options.config,
    )

    while (cursorPeriod.startsAt.getTime() <= currentPeriod.startsAt.getTime()) {
      const existingRotation = await repository.findRotationByPeriod(
        cursorPeriod.startsAt,
        cursorPeriod.endsAt,
        locale,
      )

      if (existingRotation) {
        latestRotation = existingRotation
        cursorPeriod = getNextBoosterRotationPeriod(cursorPeriod, this.options.config)
        continue
      }

      const createdRotation = await this.createRotationForPeriod(
        repository,
        locale,
        cursorPeriod,
        latestRotation.sets.map((set) => set.id),
        now,
      )

      if (isRotationError(createdRotation)) {
        return createdRotation
      }

      latestRotation = createdRotation
      cursorPeriod = getNextBoosterRotationPeriod(cursorPeriod, this.options.config)
    }

    return latestRotation
  }

  private async createRotationForPeriod(
    repository: BoosterRotationRepository,
    locale: SupportedLocale,
    period: BoosterRotationPeriod,
    excludedSetIds: string[],
    now: Date,
  ): Promise<BoosterRotationRecord | BoosterRotationServiceError> {
    const poll = await repository.findPollForDecision(period.startsAt, period.endsAt)

    if (!poll) {
      return this.createFallbackRotation(repository, locale, period, excludedSetIds)
    }

    const selectedProposal = this.selectWinningProposal(poll)

    if (!selectedProposal) {
      return this.createFallbackRotation(repository, locale, period, excludedSetIds)
    }

    if (!poll.closedAt) {
      await repository.closePoll(poll.id, selectedProposal.id, now)
    }

    return repository.createRotation({
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      sourcePollId: poll.id,
      setIds: selectedProposal.setIds,
      locale,
    })
  }

  private async createFallbackRotation(
    repository: BoosterRotationRepository,
    locale: SupportedLocale,
    period: BoosterRotationPeriod,
    excludedSetIds: string[],
  ): Promise<BoosterRotationRecord | BoosterRotationServiceError> {
    const eligibleSets = await repository.listEligibleSets(locale, SYNCED_BOOSTER_LIMIT)
    const excludedIds = new Set(excludedSetIds)
    const candidates = eligibleSets.filter((set) => !excludedIds.has(set.id))

    if (candidates.length < this.options.config.availableCount) {
      return pokemonSetsNotSynced(this.options.config.availableCount)
    }

    return repository.createRotation({
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      setIds: sampleSetIds(candidates, this.options.config.availableCount, this.random),
      locale,
    })
  }

  private async createPollForNextRotation(
    repository: BoosterRotationRepository,
    locale: SupportedLocale,
    active: BoosterRotationRecord,
    targetPeriod: BoosterRotationPeriod,
  ): Promise<BoosterRotationPollRecord | BoosterRotationServiceError> {
    const eligibleSets = await repository.listEligibleSets(locale, SYNCED_BOOSTER_LIMIT)
    const activeSetIds = new Set(active.sets.map((set) => set.id))
    const candidates = eligibleSets.filter((set) => !activeSetIds.has(set.id))

    if (candidates.length < this.options.config.availableCount) {
      return pokemonSetsNotSynced(this.options.config.availableCount * 2)
    }

    return repository.createPoll(
      {
        votingStartsAt: active.startsAt,
        votingEndsAt: active.endsAt,
        targetStartsAt: targetPeriod.startsAt,
        targetEndsAt: targetPeriod.endsAt,
        proposals: this.generateProposalSetIds(candidates),
      },
      locale,
    )
  }

  private generateProposalSetIds(candidates: EligibleSet[]): string[][] {
    const proposals: string[][] = []
    const signatures = new Set<string>()
    const possibleUniqueProposalCount = combinationCount(
      candidates.length,
      this.options.config.availableCount,
    )

    for (let index = 0; index < this.options.config.proposalCount; index += 1) {
      let proposal = sampleSetIds(candidates, this.options.config.availableCount, this.random)
      let signature = toSetIdSignature(proposal)
      let attempts = 0

      while (
        signatures.has(signature) &&
        signatures.size < possibleUniqueProposalCount &&
        attempts < 20
      ) {
        proposal = sampleSetIds(candidates, this.options.config.availableCount, this.random)
        signature = toSetIdSignature(proposal)
        attempts += 1
      }

      signatures.add(signature)
      proposals.push(proposal)
    }

    return proposals
  }

  private selectWinningProposal(
    poll: BoosterRotationPollDecisionRecord,
  ): BoosterRotationPollDecisionRecord['proposals'][number] | undefined {
    if (poll.closedAt && poll.selectedProposalId) {
      return poll.proposals.find((proposal) => proposal.id === poll.selectedProposalId)
    }

    const maxVoteCount = Math.max(...poll.proposals.map((proposal) => proposal.voteCount), 0)
    const tiedProposals = poll.proposals.filter((proposal) => proposal.voteCount === maxVoteCount)

    return pickRandom(tiedProposals, this.random)
  }
}

const toPackRotationResponse = ({ active, poll }: RotationState): PackRotationResponse => ({
  active: {
    id: active.id,
    startsAt: active.startsAt.toISOString(),
    endsAt: active.endsAt.toISOString(),
    sets: active.sets,
  },
  poll: {
    id: poll.id,
    votingStartsAt: poll.votingStartsAt.toISOString(),
    votingEndsAt: poll.votingEndsAt.toISOString(),
    targetStartsAt: poll.targetStartsAt.toISOString(),
    targetEndsAt: poll.targetEndsAt.toISOString(),
    userVoteProposalId: poll.userVoteProposalId,
    proposals: poll.proposals,
  },
})

const sampleSetIds = (candidates: EligibleSet[], count: number, random: () => number): string[] => {
  const pool = [...candidates]
  const selectedIds: string[] = []

  while (selectedIds.length < count && pool.length > 0) {
    const selectedIndex = randomIndex(pool.length, random)
    const [selected] = pool.splice(selectedIndex, 1)

    if (selected) {
      selectedIds.push(selected.id)
    }
  }

  return selectedIds
}

const pickRandom = <T>(items: T[], random: () => number): T | undefined => {
  if (items.length === 0) {
    return undefined
  }

  return items[randomIndex(items.length, random)]
}

const randomIndex = (length: number, random: () => number): number => {
  return Math.min(Math.floor(random() * length), length - 1)
}

const toSetIdSignature = (setIds: string[]): string => {
  return [...setIds].sort().join(':')
}

const combinationCount = (size: number, picks: number): number => {
  if (picks > size) {
    return 0
  }

  let result = 1

  for (let index = 1; index <= picks; index += 1) {
    result = (result * (size - picks + index)) / index
  }

  return Math.floor(result)
}

const isRotationError = <T>(
  result: T | BoosterRotationServiceError,
): result is BoosterRotationServiceError => {
  return typeof result === 'object' && result !== null && 'error' in result
}

const pokemonSetsNotSynced = (minimumSetCount: number): BoosterRotationServiceError => ({
  error: 'pokemon_sets_not_synced',
  message: `Sync at least ${minimumSetCount} Pokemon booster sets before rotating packs.`,
})

const proposalNotFound = (): BoosterRotationServiceError => ({
  error: 'pack_rotation_proposal_not_found',
  message: 'This booster rotation proposal is no longer available.',
})

const voteClosed = (): BoosterRotationServiceError => ({
  error: 'pack_rotation_vote_closed',
  message: 'Voting for this booster rotation has closed.',
})
