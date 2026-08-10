import { CheckIcon, EyeIcon, LoaderCircleIcon, PackageOpenIcon, StarIcon } from 'lucide-react'
import type { PokemonSetSummary } from '@tcg-collection/shared'

import { buttonVariants } from '@/components/ui/button'
import { useLocale } from '@/features/i18n/useLocale'
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
  ownedSetPullCounts?: ReadonlyMap<string, number>
  hideSetCardTitle?: boolean
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
  ownedSetPullCounts,
  hideSetCardTitle = false,
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
          ownedSetPullCounts={ownedSetPullCounts}
          hideSetCardTitle={hideSetCardTitle}
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
  ownedSetPullCounts?: ReadonlyMap<string, number>
  hideSetCardTitle: boolean
  onPreviewSet: (setId: string) => void
  onSelectSet: (setId: string) => void
}

function BoosterChoiceGrid({
  activeSetId,
  sets,
  setsIsPending,
  loadingLabel,
  emptyLabel,
  ownedSetPullCounts,
  hideSetCardTitle,
  onPreviewSet,
  onSelectSet,
}: BoosterChoiceGridProps) {
  const { locale } = useLocale()
  const seriesSections = groupSetsBySeries(sets)

  return (
    <fieldset className="grid gap-2 pt-2">
      <legend className="text-sm font-black text-muted-foreground">
        {m.packs_choose_booster()}
      </legend>
      {sets.length > 0 ? (
        <div className="grid gap-5 p-1">
          {seriesSections.map((section) => (
            <section key={section.id} className="grid gap-2">
              <h3 className="flex min-h-10 items-center pb-1">
                {getSeriesLogoUrl(section.id, locale) ? (
                  <img
                    src={getSeriesLogoUrl(section.id, locale)}
                    alt={section.name}
                    className={
                      section.id === 'swsh'
                        ? 'max-h-24 max-w-64 object-contain object-left'
                        : 'max-h-9 max-w-36 object-contain object-left'
                    }
                  />
                ) : (
                  <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                    {section.name}
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {section.sets.map((set) => (
                  <BoosterChoiceCard
                    key={set.id}
                    isActive={activeSetId === set.id}
                    set={set}
                    ownedSetPullCount={ownedSetPullCounts?.get(set.id) ?? 0}
                    hideSetTitle={hideSetCardTitle}
                    onPreviewSet={onPreviewSet}
                    onSelectSet={onSelectSet}
                  />
                ))}
              </div>
            </section>
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

const groupSetsBySeries = (
  sets: Array<PokemonSetSummary & { boosterImageUrl: string }>,
): Array<{
  id: string
  name: string
  sets: Array<PokemonSetSummary & { boosterImageUrl: string }>
}> => {
  const sections = new Map<
    string,
    {
      id: string
      name: string
      sets: Array<PokemonSetSummary & { boosterImageUrl: string }>
    }
  >()

  for (const set of sets) {
    const id = getSeriesId(set.id) ?? set.series
    const section = sections.get(id)

    if (section) {
      section.sets.push(set)
    } else {
      sections.set(id, { id, name: set.series, sets: [set] })
    }
  }

  return Array.from(sections.values())
}

const getSeriesId = (setId: string): string | undefined => {
  return /^(swsh|sv|me)/.exec(setId)?.[1]
}

const getSeriesLogoUrl = (seriesId: string, locale: string): string | undefined => {
  const firstSetId = {
    me: 'me01',
    sv: 'sv01',
    swsh: 'swsh1',
  }[seriesId]

  return firstSetId
    ? `https://assets.tcgdex.net/${locale}/${seriesId}/${firstSetId}/logo.png`
    : undefined
}

interface BoosterChoiceCardProps {
  isActive: boolean
  set: PokemonSetSummary
  ownedSetPullCount: number
  hideSetTitle: boolean
  onPreviewSet: (setId: string) => void
  onSelectSet: (setId: string) => void
}

function BoosterChoiceCard({
  isActive,
  set,
  ownedSetPullCount,
  hideSetTitle,
  onPreviewSet,
  onSelectSet,
}: BoosterChoiceCardProps) {
  const selectSet = () => onSelectSet(set.id)
  const isComplete = set.total > 0 && ownedSetPullCount >= set.total
  const previewImageUrl = set.logoUrl ?? set.symbolUrl ?? set.boosterImageUrl
  const imageFrameClassName = hideSetTitle
    ? 'pointer-events-none relative z-10 flex h-20 items-center justify-center overflow-hidden rounded-md bg-background'
    : 'pointer-events-none relative z-10 flex h-16 items-center justify-center overflow-hidden rounded-md bg-background'
  const imageClassName = hideSetTitle
    ? 'max-h-14 max-w-[90%] object-contain'
    : 'max-h-11 max-w-[86%] object-contain'

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
      <div className={imageFrameClassName}>
        {previewImageUrl ? (
          <img src={previewImageUrl} alt="" className={imageClassName} />
        ) : (
          <span className="text-xs font-black text-muted-foreground">
            {m.packs_pokemon_fallback()}
          </span>
        )}
      </div>
      <div className="relative z-10 mt-3 flex items-center justify-between gap-2">
        {hideSetTitle ? (
          <p className="pointer-events-none line-clamp-2 min-w-0 text-sm font-black leading-5 text-muted-foreground tabular-nums">
            {m.packs_owned_pulls({ owned: ownedSetPullCount, total: set.total })}
          </p>
        ) : (
          <p className="pointer-events-none line-clamp-2 min-w-0 text-sm font-black leading-5">
            {set.name}
          </p>
        )}
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
      {isComplete ? (
        <>
          <span className="sr-only">{m.packs_set_complete_aria({ name: set.name })}</span>
          <StarIcon
            className="absolute left-2 top-2 z-20 size-5 fill-amber-400 text-amber-400 drop-shadow-sm"
            aria-hidden="true"
          />
        </>
      ) : null}
      {isActive ? (
        <span className="absolute right-2 top-2 z-20 flex size-5 items-center justify-center rounded-full bg-sidebar text-sidebar-foreground">
          <CheckIcon className="size-3" aria-hidden="true" />
        </span>
      ) : null}
    </div>
  )
}
