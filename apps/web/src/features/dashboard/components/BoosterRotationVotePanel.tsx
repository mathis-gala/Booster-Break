import { CheckIcon, ClockIcon, LoaderCircleIcon, VoteIcon } from 'lucide-react'
import type { PackRotationResponse, PokemonSetSummary } from '@tcg-collection/shared'

import { Button } from '@/components/ui/button'
import { getLocale } from '@/paraglide/runtime'
import { m } from '@/paraglide/messages'

interface BoosterRotationVotePanelProps {
  rotation?: PackRotationResponse
  isAuthenticated: boolean
  isPending: boolean
  isVoting: boolean
  hasError: boolean
  onPreviewSet: (setId: string) => void
  onVote: (proposalId: string) => void
}

export function BoosterRotationVotePanel({
  rotation,
  isAuthenticated,
  isPending,
  isVoting,
  hasError,
  onPreviewSet,
  onVote,
}: BoosterRotationVotePanelProps) {
  const locale = getLocale()
  const isVoteClosed = rotation
    ? new Date(rotation.poll.votingEndsAt).getTime() <= Date.now()
    : false
  const statusLabel = rotation
    ? m.packs_rotation_vote_ends({ date: formatDate(rotation.poll.votingEndsAt, locale) })
    : m.packs_rotation_loading()

  return (
    <section className="rounded-lg bg-background p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-normal text-muted-foreground">
            {m.packs_rotation_vote_title()}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            {rotation
              ? m.packs_rotation_next_rotation({
                  date: formatDate(rotation.poll.targetStartsAt, locale),
                })
              : m.packs_rotation_vote_description()}
          </p>
        </div>
        <VoteIcon className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs font-black text-muted-foreground">
        <ClockIcon className="size-4" aria-hidden="true" />
        {isVoteClosed ? m.packs_rotation_vote_closed() : statusLabel}
      </div>

      <div className="mt-4 grid gap-3">
        {rotation ? (
          rotation.poll.proposals.map((proposal, index) => (
            <RotationProposalCard
              key={proposal.id}
              index={index}
              isAuthenticated={isAuthenticated}
              isSelected={rotation.poll.userVoteProposalId === proposal.id}
              isVoteClosed={isVoteClosed}
              isVoting={isVoting}
              proposal={proposal}
              onPreviewSet={onPreviewSet}
              onVote={onVote}
            />
          ))
        ) : isPending ? (
          <div className="flex min-h-28 items-center justify-center rounded-lg border bg-card p-4 text-sm font-black text-muted-foreground">
            <LoaderCircleIcon className="mr-2 size-5 animate-spin" aria-hidden="true" />
            {m.packs_rotation_loading()}
          </div>
        ) : (
          <p className="rounded-lg border bg-card p-3 text-sm font-semibold text-muted-foreground">
            {hasError ? m.packs_rotation_error() : m.packs_rotation_empty()}
          </p>
        )}
      </div>

      {!isAuthenticated ? (
        <p className="mt-3 rounded-lg border bg-card p-3 text-sm font-semibold text-muted-foreground">
          {m.packs_rotation_sign_in_required()}
        </p>
      ) : null}
    </section>
  )
}

interface RotationProposalCardProps {
  index: number
  isAuthenticated: boolean
  isSelected: boolean
  isVoteClosed: boolean
  isVoting: boolean
  proposal: PackRotationResponse['poll']['proposals'][number]
  onPreviewSet: (setId: string) => void
  onVote: (proposalId: string) => void
}

function RotationProposalCard({
  index,
  isAuthenticated,
  isSelected,
  isVoteClosed,
  isVoting,
  proposal,
  onPreviewSet,
  onVote,
}: RotationProposalCardProps) {
  const isDisabled = !isAuthenticated || isVoteClosed || isVoting

  return (
    <article
      data-selected={isSelected}
      className="rounded-lg border bg-card p-3 transition-colors data-[selected=true]:border-sidebar data-[selected=true]:ring-2 data-[selected=true]:ring-sidebar/20"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black">
            {m.packs_rotation_proposal_label({ index: index + 1 })}
          </p>
          <p className="text-xs font-semibold text-muted-foreground">
            {m.packs_rotation_vote_count({ count: proposal.voteCount })}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={isSelected ? 'secondary' : 'default'}
          disabled={isDisabled || isSelected}
          onClick={() => onVote(proposal.id)}
        >
          {isSelected ? (
            <CheckIcon data-icon="inline-start" aria-hidden="true" />
          ) : (
            <VoteIcon data-icon="inline-start" aria-hidden="true" />
          )}
          {isSelected ? m.packs_rotation_voted() : m.packs_rotation_vote()}
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {proposal.sets.map((set) => (
          <ProposalSetButton key={set.id} set={set} onPreviewSet={onPreviewSet} />
        ))}
      </div>
    </article>
  )
}

interface ProposalSetButtonProps {
  set: PokemonSetSummary
  onPreviewSet: (setId: string) => void
}

function ProposalSetButton({ set, onPreviewSet }: ProposalSetButtonProps) {
  const previewImageUrl = set.logoUrl ?? set.symbolUrl ?? set.boosterImageUrl

  return (
    <button
      type="button"
      className="grid min-h-24 gap-2 rounded-md border bg-background p-2 text-left transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onPreviewSet(set.id)}
    >
      <span className="flex h-12 items-center justify-center overflow-hidden rounded bg-card">
        {previewImageUrl ? (
          <img src={previewImageUrl} alt="" className="max-h-10 max-w-[90%] object-contain" />
        ) : (
          <span className="text-[0.65rem] font-black text-muted-foreground">
            {m.packs_pokemon_fallback()}
          </span>
        )}
      </span>
      <span className="line-clamp-2 text-[0.7rem] font-black leading-4">{set.name}</span>
    </button>
  )
}

const formatDate = (date: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
