import { CheckIcon, EyeIcon, LoaderCircleIcon, PackageOpenIcon } from 'lucide-react'
import type { PokemonSetSummary } from '@tcg-collection/shared'

import { buttonVariants } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface BoosterPickerPanelProps {
  activeSetId?: string
  collectionCount: number
  sets: Array<PokemonSetSummary & { boosterImageUrl: string }>
  setsIsPending: boolean
  onPreviewSet: (setId: string) => void
  onSelectSet: (setId: string) => void
  title?: string
  description?: string
  loadingLabel?: string
  emptyLabel?: string
  showCollectionCount?: boolean
}

export function BoosterPickerPanel({
  activeSetId,
  collectionCount,
  sets,
  setsIsPending,
  onPreviewSet,
  onSelectSet,
  title,
  description,
  loadingLabel,
  emptyLabel,
  showCollectionCount = true,
}: BoosterPickerPanelProps) {
  return (
    <div className="flex flex-col justify-between gap-5 rounded-lg bg-background p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-normal text-muted-foreground">
            {title ?? m.packs_title()}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            {description ?? m.packs_description()}
          </p>
          {showCollectionCount ? (
            <>
              <p className="mt-3 text-3xl font-black tabular-nums">{collectionCount}</p>
              <p className="text-sm font-semibold text-muted-foreground">
                {m.packs_cards_in_collection()}
              </p>
            </>
          ) : null}
        </div>
        <PackageOpenIcon className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="max-h-[36rem] overflow-y-auto pr-3">
        <BoosterChoiceGrid
          activeSetId={activeSetId}
          sets={sets}
          setsIsPending={setsIsPending}
          loadingLabel={loadingLabel}
          emptyLabel={emptyLabel}
          onPreviewSet={onPreviewSet}
          onSelectSet={onSelectSet}
        />
      </div>
    </div>
  )
}

interface BoosterChoiceGridProps {
  activeSetId?: string
  sets: Array<PokemonSetSummary & { boosterImageUrl: string }>
  setsIsPending: boolean
  loadingLabel?: string
  emptyLabel?: string
  onPreviewSet: (setId: string) => void
  onSelectSet: (setId: string) => void
}

function BoosterChoiceGrid({
  activeSetId,
  sets,
  setsIsPending,
  loadingLabel,
  emptyLabel,
  onPreviewSet,
  onSelectSet,
}: BoosterChoiceGridProps) {
  return (
    <fieldset className="grid gap-2 pt-2">
      <legend className="text-sm font-black text-muted-foreground">
        {m.packs_choose_booster()}
      </legend>
      {sets.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 p-1">
          {sets.map((set) => (
            <BoosterChoiceCard
              key={set.id}
              isActive={activeSetId === set.id}
              set={set}
              onPreviewSet={onPreviewSet}
              onSelectSet={onSelectSet}
            />
          ))}
        </div>
      ) : setsIsPending ? (
        <div className="flex min-h-32 items-center justify-center rounded-lg border bg-card p-4 text-sm font-black text-muted-foreground">
          <LoaderCircleIcon className="mr-2 size-5 animate-spin" aria-hidden="true" />
          {loadingLabel ?? m.packs_loading()}
        </div>
      ) : (
        <p className="rounded-lg border bg-card p-3 text-sm font-semibold text-muted-foreground">
          {emptyLabel ?? m.packs_empty()}
        </p>
      )}
    </fieldset>
  )
}

interface BoosterChoiceCardProps {
  isActive: boolean
  set: PokemonSetSummary
  onPreviewSet: (setId: string) => void
  onSelectSet: (setId: string) => void
}

function BoosterChoiceCard({ isActive, set, onPreviewSet, onSelectSet }: BoosterChoiceCardProps) {
  const selectSet = () => onSelectSet(set.id)
  const previewImageUrl = set.logoUrl ?? set.symbolUrl ?? set.boosterImageUrl

  return (
    <div
      role="button"
      tabIndex={0}
      data-active={isActive}
      aria-pressed={isActive}
      className="group relative min-h-32 cursor-pointer overflow-hidden rounded-lg border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:border-sidebar data-[active=true]:ring-2 data-[active=true]:ring-sidebar/20"
      onClick={selectSet}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          selectSet()
        }
      }}
    >
      <span className="sr-only">{m.packs_select_aria({ name: set.name })}</span>
      <div className="pointer-events-none relative z-10 flex h-16 items-center justify-center overflow-hidden rounded-md bg-background">
        {previewImageUrl ? (
          <img src={previewImageUrl} alt="" className="max-h-11 max-w-[86%] object-contain" />
        ) : (
          <span className="text-xs font-black text-muted-foreground">
            {m.packs_pokemon_fallback()}
          </span>
        )}
      </div>
      <div className="relative z-10 mt-3 flex items-center justify-between gap-2">
        <p className="pointer-events-none line-clamp-2 min-w-0 text-sm font-black leading-5">
          {set.name}
        </p>
        <div className="relative shrink-0">
          <button
            className={buttonVariants({
              variant: 'outline',
              size: 'icon-sm',
              className: 'peer relative z-20 rounded-full bg-background/95 shadow-sm',
            })}
            type="button"
            aria-label={m.packs_view_cards_aria({ name: set.name })}
            onClick={(event) => {
              event.stopPropagation()
              onPreviewSet(set.id)
            }}
          >
            <EyeIcon className="size-4" aria-hidden="true" />
          </button>
          <span className="pointer-events-none absolute bottom-9 right-0 z-10 w-max max-w-36 rounded-md bg-slate-950 px-2 py-1 text-[0.66rem] font-black text-slate-50 opacity-0 shadow-lg transition-opacity peer-hover:opacity-100 peer-focus-visible:opacity-100">
            {m.packs_view_cards()}
          </span>
        </div>
      </div>
      {isActive ? (
        <span className="absolute right-2 top-2 z-20 flex size-5 items-center justify-center rounded-full bg-sidebar text-sidebar-foreground">
          <CheckIcon className="size-3" aria-hidden="true" />
        </span>
      ) : null}
    </div>
  )
}
