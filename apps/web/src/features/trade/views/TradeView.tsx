import { useState, useSyncExternalStore } from 'react'
import { CheckCircle2Icon, Clock3Icon, EyeIcon, UserRoundIcon, XIcon } from 'lucide-react'

import type {
  AuctionFilters,
  AuctionRequirements,
  TradeNotificationCardPayload,
  TradeNotificationResponse,
  TradeAuctionResponse,
  TradeOfferResponse,
} from '@tcg-collection/shared'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/features/i18n/useLocale'
import { m } from '@/paraglide/messages'
import { useCurrentUserQuery } from '@/features/dashboard/hooks/useAuthQueries'
import { formatCardFinish } from '@/features/dashboard/lib/card-format'
import {
  describeAuctionRemaining,
  getAuctionRemainingMs,
  MAX_ACTIVE_AUCTIONS_PER_USER,
  formatTradeType,
} from '../lib/trade-utils'
import { tradeClock } from '../lib/trade-clock'
import {
  useAcceptTradeOfferMutation,
  useCancelTradeAuctionMutation,
  useCancelTradeOfferMutation,
  useTradeAuctionQuery,
  useTradeAuctionsQuery,
} from '../hooks/useTradeQueries'
import { TradeAuctionList } from '../components/TradeAuctionList'
import { TradeCreateAuctionPanel } from '../components/TradeCreateAuctionPanel'
import { TradeOfferComposer } from '../components/TradeOfferComposer'
import { TradeOffersPanel } from '../components/TradeOffersPanel'
import { TradeBadge } from '../components/TradeBadge'
import { TradeNotificationModal } from '../components/TradeNotificationModal'
import { toast } from '@/features/toast/toast-store'
import { FoilCardImage } from '@/features/dashboard/components/FoilCardImage'
import { CardImageDialog } from '@/features/dashboard/components/CardImageDialog'
import { formatRarity } from '@/features/i18n/rarity-labels'
import {
  usePokemonPreviewCardsQuery,
  usePokemonSetsQuery,
} from '@/features/dashboard/hooks/usePokemonQueries'
import { BoosterPreviewDialog } from '@/features/dashboard/components/BoosterPreviewDialog'

const AUCTIONS_PER_PAGE = 8
const getHiResAvatarUrl = (avatarUrl: string | undefined): string | undefined => {
  if (!avatarUrl) {
    return avatarUrl
  }

  try {
    if (!avatarUrl.includes('avatars.slack-edge.com')) {
      return avatarUrl
    }

    return avatarUrl.replace(/-(\d+)\.(jpe?g|png|webp)(?=$|\?)/i, '-512.$2')
  } catch {
    return avatarUrl
  }
}

type BadgeItem = {
  id: string
  label: string
  value: string
  kind: 'set' | 'rarity' | 'type' | 'finish'
  displayValue: string
}

const getFilterBadges = (
  filters: AuctionFilters = {},
  getSetName: (setId: string) => string,
): BadgeItem[] => {
  const { excludedSetIds, excludedRarities, excludedTypes, excludedFinishes } = filters
  return [
    ...(excludedSetIds ?? []).map((setId) => ({
      id: `excluded-set:${setId}`,
      label: m.trade_filter_set_label(),
      value: setId,
      kind: 'set' as const,
      displayValue: getSetName(setId),
    })),
    ...(excludedRarities ?? []).map((rarity) => ({
      id: `excluded-rarity:${rarity}`,
      label: m.trade_filter_rarity_label(),
      value: rarity,
      kind: 'rarity' as const,
      displayValue: formatRarity(rarity),
    })),
    ...(excludedTypes ?? []).map((type) => ({
      id: `excluded-type:${type}`,
      label: m.trade_filter_type_label(),
      value: type,
      kind: 'type' as const,
      displayValue: formatTradeType(type),
    })),
    ...(excludedFinishes ?? []).map((finish) => ({
      id: `excluded-finish:${finish}`,
      label: m.trade_filter_finish_label(),
      value: finish,
      kind: 'finish' as const,
      displayValue: formatCardFinish(finish),
    })),
  ]
}

const getRequirementBadges = (
  requirements: AuctionRequirements = {},
  getSetName: (setId: string) => string,
): BadgeItem[] => {
  const { setIds, rarities, types, finishes } = requirements

  return [
    ...(setIds ?? []).map((setId) => ({
      id: `requirement-set:${setId}`,
      label: m.trade_requirement_set_label(),
      value: setId,
      kind: 'set' as const,
      displayValue: getSetName(setId),
    })),
    ...(rarities ?? []).map((rarity) => ({
      id: `requirement-rarity:${rarity}`,
      label: m.trade_requirement_rarity_label(),
      value: rarity,
      kind: 'rarity' as const,
      displayValue: formatRarity(rarity),
    })),
    ...(types ?? []).map((type) => ({
      id: `requirement-type:${type}`,
      label: m.trade_requirement_type_label(),
      value: type,
      kind: 'type' as const,
      displayValue: formatTradeType(type),
    })),
    ...(finishes ?? []).map((finish) => ({
      id: `requirement-finish:${finish}`,
      label: m.trade_requirement_finish_label(),
      value: finish,
      kind: 'finish' as const,
      displayValue: formatCardFinish(finish),
    })),
  ]
}

type TradeOfferForModal = TradeOfferResponse

const buildAcceptedOfferNotification = (
  auction: TradeAuctionResponse,
  offer: TradeOfferForModal,
): TradeNotificationResponse => {
  const proposerName = offer.proposerDisplayName?.trim() ?? offer.proposerPseudo

  const exchangedCards: TradeNotificationCardPayload[] = offer.cards.map((card) => ({
    cardId: card.card.id,
    name: card.card.name,
    imageSmall: card.card.imageSmall,
    imageLarge: card.card.imageLarge,
    finish: card.finish,
    quantity: card.quantity,
    setId: card.card.setId,
    number: card.card.number,
  }))

  return {
    id: `accepted-offer-${offer.id}`,
    type: 'trade_offer_accepted',
    message: m.trade_notification_offer_accepted_message({ proposer: proposerName }),
    payload: {
      offerId: offer.id,
      auctionId: auction.id,
      proposerId: offer.proposerId,
      proposerPseudo: offer.proposerPseudo,
      proposerDisplayName: offer.proposerDisplayName,
      proposerAvatarUrl: offer.proposerAvatarUrl,
      offeredCard: {
        cardId: auction.offeredCard.id,
        name: auction.offeredCard.name,
        imageSmall: auction.offeredCard.imageSmall,
        imageLarge: auction.offeredCard.imageLarge,
        finish: auction.offeredCardFinish,
        quantity: 1,
        setId: auction.offeredCard.setId,
        number: auction.offeredCard.number,
      },
      exchangedCards,
    },
    viewed: false,
    createdAt: new Date().toISOString(),
  }
}

export function TradeView() {
  const { locale } = useLocale()
  const now = useSyncExternalStore(
    tradeClock.subscribe,
    tradeClock.getSnapshot,
    tradeClock.getSnapshot,
  )

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | undefined>()
  const [isAuctionCardOpen, setIsAuctionCardOpen] = useState(false)
  const [isAuctionSetPreviewOpen, setIsAuctionSetPreviewOpen] = useState(false)
  const [auctionPage, setAuctionPage] = useState(1)
  const [isOfferSuccessDialogOpen, setIsOfferSuccessDialogOpen] = useState(false)
  const [acceptedOffer, setAcceptedOffer] = useState<TradeOfferForModal | null>(null)
  const [isTradeAcceptedNotificationOpen, setIsTradeAcceptedNotificationOpen] = useState(false)

  const auth = useCurrentUserQuery()
  const auctions = useTradeAuctionsQuery(locale)
  const currentUserId = auth.data?.authenticated ? auth.data.user.id : undefined

  const auctionsFromList = auctions.data?.auctions ?? []
  const userActiveAuctions = currentUserId
    ? auctionsFromList.filter(
        (auction) => auction.creatorId === currentUserId && auction.status === 'active',
      ).length
    : 0
  const canOpenCreateAuction = Boolean(
    auth.data?.authenticated &&
    Boolean(currentUserId) &&
    userActiveAuctions < MAX_ACTIVE_AUCTIONS_PER_USER,
  )
  const auctionPageCount = Math.max(1, Math.ceil(auctionsFromList.length / AUCTIONS_PER_PAGE))

  const auctionQueryEnabled = Boolean(selectedAuctionId && isDetailsDialogOpen)
  const auctionQuery = useTradeAuctionQuery(selectedAuctionId, locale, auctionQueryEnabled)
  const selectedAuction =
    auctionQueryEnabled && auctionQuery.data
      ? auctionQuery.data
      : selectedAuctionId
        ? auctionsFromList.find((auction) => auction.id === selectedAuctionId)
        : undefined
  const setsQuery = usePokemonSetsQuery(locale)
  const selectedAuctionSetCardsQuery = usePokemonPreviewCardsQuery(
    selectedAuction?.offeredCard.setId,
    locale,
  )

  const cancelAuctionMutation = useCancelTradeAuctionMutation({
    onSuccess: () => {
      setSelectedAuctionId(undefined)
      setIsDetailsDialogOpen(false)
    },
  })
  const cancelOfferMutation = useCancelTradeOfferMutation()
  const acceptOfferMutation = useAcceptTradeOfferMutation({
    onError: () => {
      toast.show(m.trade_accept_offer_error())
    },
  })

  const closeAuctionDetails = () => {
    setIsDetailsDialogOpen(false)
    setSelectedAuctionId(undefined)
    setIsAuctionCardOpen(false)
    setIsAuctionSetPreviewOpen(false)
  }
  const closeOfferSuccessDialog = () => {
    setIsOfferSuccessDialogOpen(false)
  }
  const closeAcceptTradeNotification = () => {
    setIsTradeAcceptedNotificationOpen(false)
    setAcceptedOffer(null)
  }

  const isAnyActionRunning =
    cancelOfferMutation.isPending ||
    acceptOfferMutation.isPending ||
    cancelAuctionMutation.isPending

  if (auctions.error) {
    const message =
      auctions.error instanceof Error ? auctions.error.message : String(auctions.error)

    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {m.trade_view_load_error()} {message ? `(${message})` : null}
      </div>
    )
  }

  const remainingMs = (expiresAt: string) => getAuctionRemainingMs(expiresAt, now)

  const openAuction = (auctionId: string) => {
    setSelectedAuctionId(auctionId)
    setIsDetailsDialogOpen(true)
    setIsAuctionCardOpen(false)
    setIsAuctionSetPreviewOpen(false)
    setAuctionPage((current) => Math.min(current, auctionPageCount))
  }

  const getAuctionSetName = (setId: string): string => {
    return setsQuery.data?.find((set) => set.id === setId)?.name ?? setId
  }

  const selectedAuctionSet = selectedAuction
    ? (setsQuery.data?.find((set) => set.id === selectedAuction.offeredCard.setId) ?? {
        id: selectedAuction.offeredCard.setId,
        name: getAuctionSetName(selectedAuction.offeredCard.setId),
        series: '',
        total: 0,
        releaseDate: '',
      })
    : undefined

  const setCardsToDisplay = selectedAuctionSetCardsQuery.data ?? []
  const selectedAuctionFilterBadges = selectedAuction
    ? getFilterBadges(selectedAuction.filters, getAuctionSetName)
    : []
  const selectedAuctionRequirementBadges = selectedAuction
    ? getRequirementBadges(selectedAuction.requirements, getAuctionSetName)
    : []

  const clampedAuctionPage = Math.min(auctionPage, auctionPageCount)
  const auctionStart = (clampedAuctionPage - 1) * AUCTIONS_PER_PAGE
  const auctionsPage = auctionsFromList.slice(auctionStart, auctionStart + AUCTIONS_PER_PAGE)

  return (
    <div className="flex w-full max-w-7xl flex-col gap-4">
      <header className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black">{m.trade_view_title()}</h1>
            <p className="text-sm text-muted-foreground">{m.trade_view_subtitle()}</p>
            {currentUserId ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {m.trade_auction_creation_quota({
                  used: userActiveAuctions,
                  max: MAX_ACTIVE_AUCTIONS_PER_USER,
                })}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            disabled={!canOpenCreateAuction}
            onClick={() => {
              if (canOpenCreateAuction) {
                setIsCreateDialogOpen(true)
              }
            }}
          >
            {m.trade_create_auction()}
          </Button>
        </div>
      </header>

      <div className="space-y-4">
        <TradeAuctionList
          auctions={auctionsPage}
          selectedAuctionId={selectedAuctionId}
          locale={locale}
          currentUserId={currentUserId}
          getRemainingMs={remainingMs}
          onSelectAuction={openAuction}
          isCancelling={cancelAuctionMutation.isPending}
          onCancelAuction={(auctionId) => cancelAuctionMutation.mutate(auctionId)}
          page={clampedAuctionPage}
          pageCount={auctionPageCount}
          onPageChange={(nextPage) => setAuctionPage(Math.min(Math.max(1, nextPage), auctionPageCount))}
        />
      </div>

      {isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/78 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={m.trade_create_auction()}
          onClick={() => setIsCreateDialogOpen(false)}
        >
          <div
            className="max-h-[92dvh] w-[min(56rem,calc(100vw-1.5rem))] overflow-y-auto overflow-x-hidden rounded-lg border bg-background p-4 text-foreground shadow-2xl sm:p-6"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
                {m.trade_create_auction()}
              </h2>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsCreateDialogOpen(false)}
                aria-label={m.trade_cancel()}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </div>
            <TradeCreateAuctionPanel
              key={`trade-create-${locale}`}
              locale={locale}
              auth={auth.data ?? { authenticated: false }}
              activeAuctions={userActiveAuctions}
              onAuctionCreated={() => {
                setIsCreateDialogOpen(false)
              }}
            />
          </div>
        </div>
      ) : null}

      {isDetailsDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/78 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={m.trade_auction_details()}
          onClick={closeAuctionDetails}
        >
          <div
            className="max-h-[92dvh] w-[min(56rem,calc(100vw-1.5rem))] overflow-y-auto overflow-x-hidden rounded-lg border bg-background p-4 text-foreground shadow-2xl sm:p-6"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
                {m.trade_auction_details()}
              </h2>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={closeAuctionDetails}
                aria-label={m.trade_cancel()}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </div>

            {selectedAuction ? (
              <div className="space-y-4">
                <div className="rounded-md border bg-background p-3">
                  <div className="flex items-center gap-2">
                    {selectedAuction.creatorAvatarUrl ? (
                      <img
                        src={getHiResAvatarUrl(selectedAuction.creatorAvatarUrl)}
                        alt=""
                        width={56}
                        height={56}
                        className="size-14 shrink-0 rounded-full border border-sidebar-accent/50 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full border border-sidebar-accent/50 bg-sidebar-accent/10">
                        <UserRoundIcon className="size-7 text-sidebar-accent" aria-hidden="true" />
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-black">
                        {selectedAuction.creatorDisplayName ?? selectedAuction.creatorPseudo}{' '}
                        {m.trade_offers_cards_from()}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                        <Clock3Icon className="size-4" aria-hidden="true" />
                        {m.trade_remaining_label()}{' '}
                        {describeAuctionRemaining(remainingMs(selectedAuction.expiresAt), locale)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-3 md:grid-cols-[1fr_18rem] md:items-center">
                    <div className="space-y-3">
                      <div className="rounded-sm border border-border bg-card/40 p-2">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          {m.trade_card_details_title()}
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {selectedAuction.offeredCard.name}
                        </p>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <p>
                            {m.trade_card_number_label()} {selectedAuction.offeredCard.number}
                          </p>
                          <p>
                            {m.trade_card_rarity_label()}{' '}
                            <TradeBadge
                              kind="rarity"
                              value={selectedAuction.offeredCard.rarity ?? 'Unknown'}
                            >
                              {selectedAuction.offeredCard.rarity
                                ? formatRarity(selectedAuction.offeredCard.rarity)
                                : m.rarity_other()}
                            </TradeBadge>
                          </p>
                          <p className="flex items-center gap-2">
                            <span>{m.trade_card_set_label()}</span>
                            <TradeBadge
                              kind="set"
                              value={selectedAuction.offeredCard.setId}
                              className="max-w-[8.5rem] truncate"
                            >
                              {getAuctionSetName(selectedAuction.offeredCard.setId)}
                            </TradeBadge>
                            <button
                              type="button"
                              className="rounded-full border border-border bg-background p-1.5 hover:bg-muted cursor-pointer"
                              onClick={() => {
                                setIsAuctionSetPreviewOpen(true)
                              }}
                              aria-label={m.packs_view_cards_aria({
                                name: getAuctionSetName(selectedAuction.offeredCard.setId),
                              })}
                            >
                              <EyeIcon className="size-4" aria-hidden="true" />
                            </button>
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              {m.trade_card_finish_label()}
                            </span>
                            <TradeBadge
                              kind="finish"
                              value={selectedAuction.offeredCardFinish}
                              className="ml-1"
                            >
                              {formatCardFinish(selectedAuction.offeredCardFinish)}
                            </TradeBadge>
                          </p>
                        </div>
                      </div>
                      <div className="rounded-sm border border-border bg-card/40 p-2">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          {m.trade_requirements_label()}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {selectedAuctionRequirementBadges.length > 0 ? (
                            selectedAuctionRequirementBadges.map((badge) => (
                              <TradeBadge key={badge.id} kind={badge.kind} value={badge.value}>
                                {badge.label}: {badge.displayValue}
                              </TradeBadge>
                            ))
                          ) : (
                            <TradeBadge kind="default">{m.trade_any_card()}</TradeBadge>
                          )}
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
                          {m.trade_restrictions_label()}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {selectedAuctionFilterBadges.length > 0 ? (
                            selectedAuctionFilterBadges.map((filterText) => (
                              <TradeBadge
                                key={filterText.id}
                                kind={filterText.kind}
                                value={filterText.value}
                              >
                                {filterText.kind === 'set'
                                  ? filterText.displayValue
                                  : `${filterText.label}: ${filterText.displayValue}`}
                              </TradeBadge>
                            ))
                          ) : (
                            <TradeBadge kind="default">{m.trade_no_restriction()}</TradeBadge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="relative bg-card p-2">
                      <div className="mx-auto flex w-full max-w-[20rem] items-center justify-center">
                        {selectedAuction.offeredCard.imageLarge ||
                        selectedAuction.offeredCard.imageSmall ? (
                          <button
                            type="button"
                            className="w-full cursor-pointer"
                            onClick={(event) => {
                              event.stopPropagation()
                              setIsAuctionCardOpen(true)
                            }}
                          >
                            <FoilCardImage
                              src={
                                selectedAuction.offeredCard.imageLarge ||
                                selectedAuction.offeredCard.imageSmall ||
                                ''
                              }
                              alt={selectedAuction.offeredCard.name}
                              finish={selectedAuction.offeredCardFinish}
                              className="aspect-[63/88] w-full rounded-lg"
                            />
                          </button>
                        ) : (
                          <div
                            className="aspect-[63/88] w-full rounded-lg bg-muted"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <TradeOffersPanel
                  auction={selectedAuction}
                  userId={currentUserId}
                  onCancelOffer={(offerId) => cancelOfferMutation.mutate(offerId)}
                  onAcceptOffer={(offerId) => {
                    if (!selectedAuctionId) {
                      toast.show(m.trade_accept_offer_error())
                      return
                    }

                    const offerToAccept = selectedAuction.offers.find((offer) => offer.id === offerId)

                    if (!offerToAccept) {
                      toast.show(m.trade_accept_offer_error())
                      return
                    }

                    acceptOfferMutation.mutate(
                      {
                        auctionId: selectedAuctionId,
                        offerId,
                      },
                      {
                        onSuccess: () => {
                          setAcceptedOffer(offerToAccept)
                          setIsTradeAcceptedNotificationOpen(true)
                          void auctionQuery.refetch()
                        },
                        onError: () => {
                          setAcceptedOffer(null)
                        },
                      },
                    )
                  }}
                  isBusy={isAnyActionRunning}
                />

                <TradeOfferComposer
                  key={`trade-offer-${selectedAuction.id}-${locale}`}
                  auction={selectedAuction}
                  locale={locale}
                  userId={currentUserId}
                  onOfferCreated={() => {
                    auctionQuery.refetch()
                    closeAuctionDetails()
                    setIsOfferSuccessDialogOpen(true)
                  }}
                />
              </div>
            ) : isDetailsDialogOpen && selectedAuctionId && auctionQuery.isPending ? (
              <p className="text-sm font-semibold text-muted-foreground">
                {m.trade_loading_auction_details()}
              </p>
            ) : selectedAuctionId ? (
              <p className="text-sm font-semibold text-muted-foreground">
                {m.trade_auction_not_found()}
              </p>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">
                {m.trade_pick_auction_to_inspect()}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {selectedAuction && isAuctionCardOpen ? (
        <CardImageDialog
          card={{
            ...selectedAuction.offeredCard,
            finish: selectedAuction.offeredCardFinish,
          }}
          onClose={() => setIsAuctionCardOpen(false)}
        />
      ) : null}

      {selectedAuction && isAuctionSetPreviewOpen ? (
        <BoosterPreviewDialog
          cards={setCardsToDisplay}
          isPending={selectedAuctionSetCardsQuery.isPending}
          set={
            selectedAuctionSet ?? {
              id: selectedAuction.offeredCard.setId,
              name: getAuctionSetName(selectedAuction.offeredCard.setId),
              series: '',
              total: 0,
              releaseDate: '',
            }
          }
          onClose={() => setIsAuctionSetPreviewOpen(false)}
        />
      ) : null}

      {isOfferSuccessDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/78 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={m.trade_offer_success_title()}
          onClick={closeOfferSuccessDialog}
        >
          <div
            className="w-full max-w-sm rounded-lg border bg-background p-4 shadow-2xl"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2Icon
                className="mt-0.5 size-6 shrink-0 text-green-600"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-black">{m.trade_offer_success_title()}</p>
                <p className="mt-1 text-sm text-muted-foreground">{m.trade_offer_success_message()}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={closeOfferSuccessDialog}>
                {m.trade_offer_success_ok()}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isTradeAcceptedNotificationOpen && acceptedOffer && selectedAuction ? (
        <TradeNotificationModal
          notification={buildAcceptedOfferNotification(selectedAuction, acceptedOffer)}
          onClose={closeAcceptTradeNotification}
        />
      ) : null}

    </div>
  )
}
