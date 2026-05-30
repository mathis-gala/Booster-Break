import type { TradeAuctionResponse } from '@tcg-collection/shared'
import { UserRoundIcon } from 'lucide-react'
import { m } from '@/paraglide/messages'
import { formatCardFinish } from '@/features/dashboard/lib/card-format'
import { FoilCardImage } from '@/features/dashboard/components/FoilCardImage'

interface TradeOffersPanelProps {
  auction: TradeAuctionResponse
  userId?: string
  onCancelOffer: (offerId: string) => void
  onAcceptOffer: (auctionId: string, offerId: string) => void
  isBusy: boolean
}

export function TradeOffersPanel({
  auction,
  userId,
  onCancelOffer,
  onAcceptOffer,
  isBusy,
}: TradeOffersPanelProps) {
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
                        onClick={() => onAcceptOffer(auction.id, offer.id)}
                      >
                        {m.trade_accept_offer()}
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer rounded-md border border-destructive/60 bg-destructive/10 px-2 py-1 text-xs font-black text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isBusy}
                        onClick={() => onCancelOffer(offer.id)}
                      >
                        {m.trade_reject_offer()}
                      </button>
                    </>
                  ) : isProposer ? (
                    <button
                      type="button"
                      className="cursor-pointer rounded-md border border-amber-700 bg-amber-700/10 px-2 py-1 text-xs font-black text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isBusy}
                      onClick={() => onCancelOffer(offer.id)}
                    >
                      {m.trade_cancel_offer()}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {offer.cards.map((card) => (
                <div
                  key={`${offer.id}-${card.card.id}-${card.finish}`}
                  className="rounded-md border bg-card p-1.5"
                >
                  {card.card.imageSmall ? (
                    <FoilCardImage
                      src={card.card.imageSmall}
                      alt={card.card.name}
                      finish={card.finish}
                      className="aspect-[63/88] w-12 rounded-sm"
                    />
                  ) : (
                    <div className="aspect-[63/88] w-12 rounded-sm bg-muted" aria-hidden="true" />
                  )}
                  <p className="mt-1 truncate text-[0.64rem] font-black">{card.card.name}</p>
                  <p className="text-[0.64rem] font-semibold text-muted-foreground">
                    x{card.quantity} · {formatCardFinish(card.finish)}
                  </p>
                </div>
              ))}
            </div>
          </article>
        )
      })}
    </div>
  )
}
