import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { OpenedPackCard, OpenPackResponse, PokemonSetSummary } from '@tcg-collection/shared'

import { PackOpeningExperience } from '@/features/dashboard/components/PackOpeningExperience'
import { preloadPackImages } from '@/features/dashboard/lib/preload-pack-images'
import {
  usePokemonPreviewCardsQueryOption,
  usePokemonSetsQueryOption,
  useSandboxPokemonPreviewCardsQueryOption,
  useSandboxPokemonSetsQueryOption,
} from '@/lib/queries/pokemon'
import {
  createRealPack,
  getForcedPullOptions,
  isAuthenticPackSetId,
  type ForcedPullId,
} from './real-pack-generator'

type OpeningPreset =
  | 'standard'
  | 'holo'
  | 'rr'
  | 'ir'
  | 'sr'
  | 'ace-spec'
  | 'jackpot-sir'
  | 'jackpot-mhr'
  | 'jackpot-gg-ultra'
  | 'jackpot-gg-secret'
  | 'mixed'

interface PresetDefinition {
  label: string
  description: string
  finalCards: readonly OpenedPackCard[]
}

interface RealSetOption {
  key: string
  source: 'catalog' | 'sandbox'
  set: PokemonSetSummary
}

interface ActiveOpening {
  pack: OpenPackResponse
  label: string
}

const STANDARD_IMAGE = 'https://assets.tcgdex.net/en/sv/sv10/034/high.png'

const HOLO_CARD = createCard({
  id: 'sv10-034',
  number: '034',
  name: 'Rare Holo sample',
  rarity: 'Rare',
  finish: 'holo',
  imageLarge: STANDARD_IMAGE,
})

const RR_CARD = createCard({
  id: 'me01-003',
  number: '003',
  name: 'Double Rare sample',
  rarity: 'Double Rare',
  finish: 'holo',
  imageLarge: 'https://assets.tcgdex.net/en/me/me01/003/high.png',
})

const IR_CARD = createCard({
  id: 'me01-133',
  number: '133',
  name: 'Illustration Rare sample',
  rarity: 'Illustration Rare',
  finish: 'holo',
  imageLarge: 'https://assets.tcgdex.net/en/me/me01/133/high.png',
})

const SR_CARD = createCard({
  id: 'me01-155',
  number: '155',
  name: 'Super Rare sample',
  rarity: 'Ultra Rare',
  finish: 'holo',
  imageLarge: 'https://assets.tcgdex.net/en/me/me01/155/high.png',
})

const ACE_SPEC_CARD = createCard({
  id: 'sv08.5-116',
  setId: 'sv08.5',
  number: '116',
  name: 'ACE SPEC sample',
  rarity: 'ACE SPEC Rare',
  finish: 'holo',
  imageLarge: 'https://assets.tcgdex.net/en/sv/sv08.5/116/high.png',
})

const SIR_CARD = createCard({
  id: 'me01-177',
  number: '177',
  name: 'SIR jackpot sample',
  rarity: 'Special Illustration Rare',
  finish: 'holo',
  imageLarge: 'https://assets.tcgdex.net/en/me/me01/177/high.png',
})

const MHR_CARD = createCard({
  id: 'me01-187',
  number: '187',
  name: 'MHR jackpot sample',
  rarity: 'Méga Hyper Rare',
  finish: 'holo',
  imageLarge: 'https://assets.tcgdex.net/en/me/me01/187/high.png',
})

const GG_ULTRA_CARD = createCard({
  id: 'swsh12.5gg-GG35',
  setId: 'swsh12.5gg',
  number: 'GG35',
  name: 'Galarian Gallery Ultra sample',
  rarity: 'Ultra Rare',
  finish: 'holo',
  imageLarge: 'https://assets.tcgdex.net/en/swsh/swsh12.5/GG35/high.png',
})

const GG_SECRET_CARD = createCard({
  id: 'swsh12.5gg-GG67',
  setId: 'swsh12.5gg',
  number: 'GG67',
  name: 'Galarian Gallery Secret sample',
  rarity: 'Secret Rare',
  finish: 'holo',
  imageLarge: 'https://assets.tcgdex.net/en/swsh/swsh12.5/GG67/high.png',
})

const PRESETS: Readonly<Record<OpeningPreset, PresetDefinition>> = {
  standard: {
    label: 'Standard pack',
    description: 'Ten standard cards with the existing reveal behavior.',
    finalCards: [],
  },
  holo: {
    label: 'Holo finish',
    description: 'A holo card in the final slot to inspect the stronger ambient glow.',
    finalCards: [HOLO_CARD],
  },
  rr: {
    label: 'RR / Double Rare',
    description: 'A Double Rare in the final slot with a broader, longer artwork-colored burst.',
    finalCards: [RR_CARD],
  },
  ir: {
    label: 'IR / Illustration Rare',
    description: 'An Illustration Rare with a soft five-color artwork aura and scattered light.',
    finalCards: [IR_CARD],
  },
  sr: {
    label: 'SR / Ultra Rare',
    description: 'An Ultra Rare with extended particles and stronger artwork-color lighting.',
    finalCards: [SR_CARD],
  },
  'ace-spec': {
    label: 'ACE SPEC',
    description: 'An ACE SPEC reveal with bright pink light and particles.',
    finalCards: [ACE_SPEC_CARD],
  },
  'jackpot-sir': {
    label: 'Jackpot / SIR',
    description: 'A Special Illustration Rare with the twenty-one-second cinematic.',
    finalCards: [SIR_CARD],
  },
  'jackpot-mhr': {
    label: 'Jackpot / MHR',
    description: 'A Mega Hyper Rare with the twenty-one-second cinematic.',
    finalCards: [MHR_CARD],
  },
  'jackpot-gg-ultra': {
    label: 'Jackpot / GG Ultra',
    description: 'A Galarian Gallery Ultra Rare (GG35) with the jackpot treatment.',
    finalCards: [GG_ULTRA_CARD],
  },
  'jackpot-gg-secret': {
    label: 'Jackpot / GG Secret',
    description: 'A Galarian Gallery Secret Rare (GG67) with the jackpot treatment.',
    finalCards: [GG_SECRET_CARD],
  },
  mixed: {
    label: 'Mixed escalation',
    description: 'Standard cards followed by Holo, RR, IR, SR, ACE SPEC, and Jackpot reveals.',
    finalCards: [HOLO_CARD, RR_CARD, IR_CARD, SR_CARD, ACE_SPEC_CARD, SIR_CARD],
  },
}

export function OpeningLab() {
  const [preset, setPreset] = useState<OpeningPreset>('mixed')
  const [selectedRealSetKey, setSelectedRealSetKey] = useState('')
  const [forcedPull, setForcedPull] = useState<ForcedPullId>('random')
  const [activeOpening, setActiveOpening] = useState<ActiveOpening>()
  const [loadingTarget, setLoadingTarget] = useState<'fixture' | 'real'>()
  const [labError, setLabError] = useState<string>()
  const catalogSetsQuery = useQuery(usePokemonSetsQueryOption())
  const sandboxSetsQuery = useQuery(useSandboxPokemonSetsQueryOption())
  const realSetOptions = buildRealSetOptions(
    catalogSetsQuery.data ?? [],
    sandboxSetsQuery.data ?? [],
  )
  const effectiveRealSetKey = realSetOptions.some((option) => option.key === selectedRealSetKey)
    ? selectedRealSetKey
    : (realSetOptions[0]?.key ?? '')
  const selectedRealSet = realSetOptions.find((option) => option.key === effectiveRealSetKey)
  const catalogCardsQuery = useQuery(
    usePokemonPreviewCardsQueryOption(
      selectedRealSet?.source === 'catalog' ? selectedRealSet.set.id : undefined,
    ),
  )
  const sandboxCardsQuery = useQuery(
    useSandboxPokemonPreviewCardsQueryOption(
      selectedRealSet?.source === 'sandbox' ? selectedRealSet.set.id : undefined,
    ),
  )
  const realCards =
    selectedRealSet?.source === 'sandbox'
      ? (sandboxCardsQuery.data ?? [])
      : (catalogCardsQuery.data ?? [])
  const forcedPullOptions = selectedRealSet
    ? getForcedPullOptions(selectedRealSet.set.id, realCards)
    : []
  const effectiveForcedPull = forcedPullOptions.some((option) => option.id === forcedPull)
    ? forcedPull
    : 'random'
  const selectedForcedPull = forcedPullOptions.find((option) => option.id === effectiveForcedPull)
  const realCardsLoading =
    selectedRealSet?.source === 'sandbox'
      ? sandboxCardsQuery.isLoading
      : catalogCardsQuery.isLoading
  const selectedPreset = PRESETS[preset]

  const openFixturePack = async () => {
    setLoadingTarget('fixture')
    setLabError(undefined)

    try {
      const pack = createPack(preset)
      await preloadPackImages(pack)
      setActiveOpening({ pack, label: `${selectedPreset.label} - development fixture` })
    } finally {
      setLoadingTarget(undefined)
    }
  }

  const openRealPack = async () => {
    if (!selectedRealSet || realCards.length === 0) return

    setLoadingTarget('real')
    setLabError(undefined)

    try {
      const pack = createRealPack(selectedRealSet.set, realCards, effectiveForcedPull)
      await preloadPackImages(pack)
      setActiveOpening({
        pack,
        label: `${selectedForcedPull?.label ?? 'Production odds'} - randomized real pack`,
      })
    } catch (error) {
      setLabError(error instanceof Error ? error.message : 'Unable to generate this pack.')
    } finally {
      setLoadingTarget(undefined)
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-5 py-10 text-slate-950 sm:px-8 sm:py-16">
      <section className="mx-auto max-w-5xl">
        <p className="mb-3 text-xs font-black tracking-[0.24em] text-cyan-700 uppercase">
          Development only
        </p>
        <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Pack opening lab</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
          Open randomized packs from the real catalog with production slot ordering, or replay a
          deterministic visual-effect fixture. Nothing is added to a collection.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/55 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[0.18em] text-cyan-700 uppercase">
                  Real randomized pack
                </p>
                <h2 className="mt-2 text-xl font-black">Catalog sets and authentic slots</h2>
              </div>
              {selectedRealSet?.set.logoUrl ? (
                <img
                  src={selectedRealSet.set.logoUrl}
                  alt=""
                  className="h-12 w-24 object-contain"
                />
              ) : null}
            </div>

            <label htmlFor="real-pack-set" className="mt-6 block text-sm font-bold text-slate-800">
              Booster set
            </label>
            <select
              id="real-pack-set"
              value={effectiveRealSetKey}
              onChange={(event) => {
                setSelectedRealSetKey(event.target.value)
                setForcedPull('random')
              }}
              disabled={realSetOptions.length === 0}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-100"
            >
              {realSetOptions.length === 0 ? <option>Loading real sets...</option> : null}
              {realSetOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.set.name} ({option.set.id})
                </option>
              ))}
            </select>

            <label htmlFor="forced-pull" className="mt-5 block text-sm font-bold text-slate-800">
              Forced pull
            </label>
            <select
              id="forced-pull"
              value={effectiveForcedPull}
              onChange={(event) => setForcedPull(event.target.value as ForcedPullId)}
              disabled={!selectedRealSet || realCardsLoading || forcedPullOptions.length === 0}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-100"
            >
              {realCardsLoading ? <option>Loading real cards...</option> : null}
              {forcedPullOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                  {option.candidateCount ? ` - ${option.candidateCount} possible cards` : ''}
                </option>
              ))}
            </select>

            <p className="mt-3 min-h-10 text-sm leading-5 text-slate-500">
              Remaining slots and card identities are freshly randomized using the production pack
              generator. Forced cards replace only their legal slot.
            </p>

            <button
              type="button"
              disabled={
                loadingTarget !== undefined ||
                !selectedRealSet ||
                realCardsLoading ||
                realCards.length === 0
              }
              onClick={() => void openRealPack()}
              className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-45"
            >
              {loadingTarget === 'real' ? 'Randomizing and preloading...' : 'Open real forced pack'}
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/45 sm:p-7">
            <p className="text-xs font-black tracking-[0.18em] text-slate-500 uppercase">
              Effect fixture
            </p>
            <h2 className="mt-2 text-xl font-black">Deterministic visual test</h2>

            <label htmlFor="opening-preset" className="mt-6 block text-sm font-bold text-slate-800">
              Forced scenario
            </label>
            <select
              id="opening-preset"
              value={preset}
              onChange={(event) => setPreset(event.target.value as OpeningPreset)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            >
              {(Object.entries(PRESETS) as Array<[OpeningPreset, PresetDefinition]>).map(
                ([value, definition]) => (
                  <option key={value} value={value}>
                    {definition.label}
                  </option>
                ),
              )}
            </select>

            <p className="mt-3 min-h-10 text-sm leading-5 text-slate-500">
              {selectedPreset.description}
            </p>

            <button
              type="button"
              disabled={loadingTarget !== undefined}
              onClick={() => void openFixturePack()}
              className="mt-6 w-full rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-45"
            >
              {loadingTarget === 'fixture' ? 'Preloading artwork...' : 'Open effect fixture'}
            </button>
          </section>
        </div>

        {catalogSetsQuery.isError || sandboxSetsQuery.isError ? (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            Some real set sources are unavailable. Start the API to load all pack options.
          </p>
        ) : null}
        {labError ? (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {labError}
          </p>
        ) : null}
      </section>

      {activeOpening ? (
        <PackOpeningExperience
          key={activeOpening.pack.openingId}
          openPackResult={activeOpening.pack}
          resultLabel={activeOpening.label}
          onComplete={() => setActiveOpening(undefined)}
        />
      ) : null}
    </main>
  )
}

const buildRealSetOptions = (
  catalogSets: PokemonSetSummary[],
  sandboxSets: PokemonSetSummary[],
): RealSetOption[] => {
  const options = new Map<string, RealSetOption>()

  for (const set of catalogSets) {
    if (isAuthenticPackSetId(set.id) && set.boosterImageUrl) {
      options.set(set.id, { key: `catalog:${set.id}`, source: 'catalog', set })
    }
  }

  for (const set of sandboxSets) {
    if (isAuthenticPackSetId(set.id) && set.boosterImageUrl && !options.has(set.id)) {
      options.set(set.id, { key: `sandbox:${set.id}`, source: 'sandbox', set })
    }
  }

  return [...options.values()].sort(
    (first, second) =>
      new Date(second.set.releaseDate).getTime() - new Date(first.set.releaseDate).getTime(),
  )
}

const createPack = (preset: OpeningPreset): OpenPackResponse => {
  const specialCards = PRESETS[preset].finalCards
  const standardCount = 10 - specialCards.length
  const cards = [
    ...Array.from({ length: standardCount }, (_, index) =>
      createCard({
        id: `opening-lab-standard-${index + 1}`,
        number: String(index + 1).padStart(3, '0'),
        name: `Standard sample ${index + 1}`,
        rarity: index < 5 ? 'Common' : 'Uncommon',
        finish: 'normal',
        imageLarge: STANDARD_IMAGE,
      }),
    ),
    ...specialCards,
  ]

  return {
    openingId: `opening-lab-${preset}-${Date.now()}`,
    set: {
      id: 'swsh12.5',
      name: `Opening Lab - ${PRESETS[preset].label}`,
      series: 'Development fixture',
      total: cards.length,
      releaseDate: '2023-01-20',
      boosterImageUrl: 'https://images.scrydex.com/pokemon/swsh12pt5-s1/large',
    },
    cards,
    isGodPack: false,
  }
}

function createCard(
  input: Pick<OpenedPackCard, 'id' | 'number' | 'name' | 'rarity' | 'finish' | 'imageLarge'> &
    Partial<Pick<OpenedPackCard, 'setId'>>,
): OpenedPackCard {
  return {
    ...input,
    setId: input.setId ?? 'opening-lab',
    supertype: 'Pokémon',
    finishes: input.finish ? [input.finish] : ['normal'],
    isNew: false,
  }
}
