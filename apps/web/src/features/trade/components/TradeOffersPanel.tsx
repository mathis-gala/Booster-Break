import type {
  TradeAuctionResponse,
  TradeOfferCardResponse,
} from '@tcg-collection/shared'
import { useState } from 'react'
import { UserRoundIcon } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import { CardImageDialog } from '@/features/dashboard/components/CardImageDialog'
import { FoilCardImage } from '@/features/dashboard/components/FoilCardImage'

interface TradeOffersPanelProps {
  auction: TradeAuctionResponse
  userId?: string
  onCancelOffer: (offerId: string) => void
  onAcceptOffer: (offerId: string) => void
  isBusy: boolean
}

export function TradeOffersPanel({
  auction,
  userId,
  onCancelOffer,
  onAcceptOffer,
  isBusy,
}: TradeOffersPanelProps) {
  const [selectedOfferCard, setSelectedOfferCard] = useState<TradeOfferCardResponse | null>(null)
  const [offerIdToCancel, setOfferIdToCancel] = useState<string | null>(null)
  const [offerIdToAccept, setOfferIdToAccept] = useState<string | null>(null)

  const pendingOfferToCancel =
    offerIdToCancel === null
      ? null
      : auction.offers.find((offer) => offer.id === offerIdToCancel && offer.status === 'pending') ?? null
  const pendingOfferToAccept =
    offerIdToAccept === null
      ? null
      : auction.offers.find((offer) => offer.id === offerIdToAccept && offer.status === 'pending') ?? null

  const requestOfferCancel = (offerId: string) => {
    setOfferIdToCancel(offerId)
  }

  const requestOfferAccept = (offerId: string) => {
    setOfferIdToAccept(offerId)
  }

  const closeOfferCancelDialog = () => {
    setOfferIdToCancel(null)
  }

  const confirmOfferCancel = () => {
    if (!pendingOfferToCancel) {
      return
    }

    onCancelOffer(pendingOfferToCancel.id)
    setOfferIdToCancel(null)
  }

  const closeOfferAcceptDialog = () => {
    setOfferIdToAccept(null)
  }

  const confirmOfferAccept = () => {
    if (!pendingOfferToAccept) {
      return
    }

    onAcceptOffer(pendingOfferToAccept.id)
    setOfferIdToAccept(null)
  }

  const renderOfferCards = (offer: TradeAuctionResponse['offers'][number], isPending: boolean) => {
    if (offer.cards.length === 0) {
      return (
        <p className="rounded-md border border-dashed bg-background px-3 py-2 text-xs text-muted-foreground">
          {m.trade_offer_no_selected()}
        </p>
      )
    }

    if (!isPending) {
      return null
    }

    return (
      <div className="mt-2 flex w-full flex-wrap items-center justify-center gap-3">
        {offer.cards.map((card) => (
          <button
            type="button"
            key={`${offer.id}-${card.card.id}-${card.finish}`}
            className="inline-flex w-48 shrink-0 flex-col items-center gap-1 rounded-lg border bg-card px-3 py-3 text-center transition hover:border-sidebar/60"
            onClick={() => {
              setSelectedOfferCard(card)
            }}
          >
            {card.card.imageSmall ? (
              <FoilCardImage
                src={card.card.imageSmall}
                alt={card.card.name}
                finish={card.finish}
                className="aspect-[63/88] w-32 rounded-md"
              />
            ) : (
              <div className="aspect-[63/88] w-32 rounded-md bg-muted" aria-hidden="true" />
            )}
            <p className="mt-1 max-w-full truncate text-sm font-black">{card.card.name}</p>
            <p className="text-sm font-black text-muted-foreground">x{card.quantity}</p>
            <p className="text-sm text-muted-foreground">{card.card.supertype ?? m.trade_other_type()}</p>
          </button>
        ))}
      </div>
    )
  }

  if (auction.offers.length === 0) {
    return (
      <p className="rounded-lg border bg-background p-3 text-sm font-semibold text-muted-foreground">
        {m.trade_no_offers_yet()}
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      {auction.offers.map((offer) => {
        const isCreator = userId === auction.creatorId
        const isProposer = userId === offer.proposerId
        const isPending = offer.status === 'pending'

        return (
          <article key={offer.id} className="rounded-lg border bg-background p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {offer.proposerAvatarUrl ? (
                  <img
                    src={offer.proposerAvatarUrl}
                    alt=""
                    className="size-8 shrink-0 rounded-full border border-sidebar-accent/50 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-sidebar-accent bg-sidebar-accent/10">
                    <UserRoundIcon className="size-4 text-sidebar-accent" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-black">
                    {offer.proposerDisplayName ?? offer.proposerPseudo}
                  </p>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {offer.status === 'pending'
                      ? m.trade_offer_status_pending()
                      : offer.status === 'accepted'
                        ? m.trade_offer_status_accepted()
                        : offer.status === 'rejected'
                          ? m.trade_offer_status_rejected()
                          : m.trade_offer_status_cancelled()}
                  </p>
                </div>
              </div>

              {isPending ? (
                <div className="flex flex-wrap items-center gap-2">
                  {isCreator ? (
                    <>
                      <button
                        type="button"
                        className="cursor-pointer rounded-md border border-green-700 bg-green-700/10 px-2 py-1 text-xs font-black text-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isBusy}
                        onClick={() => requestOfferAccept(offer.id)}
                      >
                        {m.trade_accept_offer()}
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer rounded-md border border-destructive/60 bg-destructive/10 px-2 py-1 text-xs font-black text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isBusy}
                        onClick={() => requestOfferCancel(offer.id)}
                      >
                        {m.trade_reject_offer()}
                      </button>
                    </>
                  ) : isProposer ? (
                    <button
                      type="button"
                      className="cursor-pointer rounded-md border border-amber-700 bg-amber-700/10 px-2 py-1 text-xs font-black text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isBusy}
                      onClick={() => requestOfferCancel(offer.id)}
                    >
                      {m.trade_cancel_offer()}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {renderOfferCards(offer, isPending)}
          </article>
        )
      })}

      {pendingOfferToCancel ? (
        <ConfirmationDialog
          open
          className="z-50"
          title={m.trade_cancel_offer_title()}
          description={m.trade_cancel_offer_message()}
          confirmLabel={m.trade_cancel_offer_confirm()}
          cancelLabel={m.trade_cancel()}
          onConfirm={confirmOfferCancel}
          onCancel={closeOfferCancelDialog}
          isBusy={isBusy}
        />
      ) : null}

      {pendingOfferToAccept ? (
        <ConfirmationDialog
          open
          className="z-50"
          title={m.trade_accept_offer_title()}
          description={m.trade_accept_offer_message()}
          confirmLabel={m.trade_accept_offer_confirm()}
          cancelLabel={m.trade_cancel()}
          onConfirm={confirmOfferAccept}
          onCancel={closeOfferAcceptDialog}
          isBusy={isBusy}
        />
      ) : null}

      {selectedOfferCard ? (
        <CardImageDialog
          card={{
            ...selectedOfferCard.card,
            finish: selectedOfferCard.finish,
          }}
          onClose={() => {
            setSelectedOfferCard(null)
          }}
        />
      ) : null}
    </div>
  )
}
