import { Trash2Icon, UserRoundIcon } from 'lucide-react'
import { useState } from 'react'
import type { SupportedLocale, TradeAuctionResponse } from '@tcg-collection/shared'
import { ConfirmationDialog } from '@/components/ConfirmationDialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { FoilCardImage } from '@/features/dashboard/components/FoilCardImage'
import { describeAuctionRemaining } from '../lib/trade-utils'
import { TradeNotOwnedBadge } from './TradeNotOwnedBadge'

interface TradeAuctionListProps {
  auctions: TradeAuctionResponse[]
  selectedAuctionId?: string
  locale: SupportedLocale
  currentUserId?: string
  ownedCardIds?: ReadonlySet<string>
  onSelectAuction: (auctionId: string) => void
  getRemainingMs: (expiresAt: string) => number
  onCancelAuction: (auctionId: string) => void
  isCancelling: boolean
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}

export function TradeAuctionList({
  auctions,
  selectedAuctionId,
  locale,
  currentUserId,
  ownedCardIds,
  onSelectAuction,
  getRemainingMs,
  onCancelAuction,
  isCancelling,
  page,
  pageCount,
  onPageChange,
}: TradeAuctionListProps) {
  const [auctionIdToCancel, setAuctionIdToCancel] = useState<string | null>(null)
  const selectedAuctionToCancel = auctions.find((auction) => auction.id === auctionIdToCancel)

  if (auctions.length === 0) {
    return (
      <section className="rounded-lg border bg-card p-4">
        <h2 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
          {m.trade_active_auctions()}
        </h2>
        <p className="mt-3 text-sm font-semibold text-muted-foreground">
          {m.trade_no_active_auctions()}
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
        {m.trade_active_auctions()}
      </h2>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {auctions.map((auction) => {
          const isSelected = auction.id === selectedAuctionId
          const isOwnAuction = currentUserId !== undefined && auction.creatorId === currentUserId
          const remainingMs = getRemainingMs(auction.expiresAt)
          const isNotOwned = ownedCardIds ? !ownedCardIds.has(auction.offeredCard.id) : false

          return (
            <article
              key={auction.id}
              className={cn(
                'w-60 shrink-0 cursor-pointer overflow-hidden rounded-lg border p-3 transition sm:w-64',
                isSelected
                  ? 'border-sidebar bg-sidebar/8 ring-2 ring-sidebar'
                  : 'border-border bg-background hover:border-sidebar/60',
              )}
              onClick={() => onSelectAuction(auction.id)}
              role="button"
              tabIndex={0}
              aria-label={m.trade_open_auction_aria({ cardName: auction.offeredCard.name })}
            >
              <div className="relative w-full rounded-md bg-card/40 p-2">
                {isNotOwned ? <TradeNotOwnedBadge className="absolute left-1 top-1 z-10" /> : null}
                <button
                  type="button"
                  className="w-full cursor-pointer text-left"
                  onClick={(event) => {
                    event.stopPropagation()
                    onSelectAuction(auction.id)
                  }}
                >
                  <div className="space-y-2">
                    <div className="w-full rounded-md bg-card/20 p-1">
                      {auction.offeredCard.imageLarge || auction.offeredCard.imageSmall ? (
                        <FoilCardImage
                          src={
                            auction.offeredCard.imageLarge ?? auction.offeredCard.imageSmall ?? ''
                          }
                          alt={auction.offeredCard.name}
                          finish={auction.offeredCardFinish}
                          className="aspect-63/88 w-full max-w-full rounded-sm"
                        />
                      ) : (
                        <div className="aspect-63/88 rounded-sm bg-muted" aria-hidden="true" />
                      )}
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        {auction.creatorAvatarUrl ? (
                          <img
                            src={auction.creatorAvatarUrl}
                            alt=""
                            className="size-4 rounded-full border border-sidebar-accent object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="inline-flex size-4 items-center justify-center rounded-full border border-sidebar-accent bg-sidebar-accent/10">
                            <UserRoundIcon
                              className="size-3 text-sidebar-accent"
                              aria-hidden="true"
                            />
                          </span>
                        )}
                        <span className="font-semibold text-sm">
                          {auction.creatorDisplayName ?? auction.creatorPseudo}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-bold">{auction.offerCount}</span>{' '}
                        {auction.offerCount === 1
                          ? m.trade_offer_count_one()
                          : m.trade_offer_count_other()}
                      </p>
                      <p className="text-xs font-black">
                        {m.trade_remaining_label()}: {describeAuctionRemaining(remainingMs, locale)}
                      </p>
                    </div>
                  </div>
                </button>

                {isOwnAuction ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute -right-1 -top-1 h-6 w-6 cursor-pointer border-destructive/45 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:text-destructive/40"
                    disabled={isCancelling}
                    onClick={(event) => {
                      event.stopPropagation()
                      setAuctionIdToCancel(auction.id)
                    }}
                  >
                    <Trash2Icon className="size-3" aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      <ConfirmationDialog
        open={auctionIdToCancel !== null}
        title={m.trade_cancel_auction_title()}
        description={
          selectedAuctionToCancel
            ? m.trade_cancel_auction_message({ cardName: selectedAuctionToCancel.offeredCard.name })
            : m.trade_cancel_auction_message({ cardName: '' })
        }
        confirmLabel={m.trade_cancel_auction_confirm()}
        cancelLabel={m.trade_cancel()}
        isBusy={isCancelling}
        onCancel={() => setAuctionIdToCancel(null)}
        onConfirm={() => {
          if (auctionIdToCancel) {
            onCancelAuction(auctionIdToCancel)
            setAuctionIdToCancel(null)
          }
        }}
      />

      {pageCount > 1 ? (
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-24 justify-self-start"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(page - 1, 1))}
          >
            {m.packs_previous()}
          </Button>
          <p className="text-sm font-black tabular-nums text-muted-foreground">
            {page} / {pageCount}
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-24 justify-self-end"
            disabled={page >= pageCount}
            onClick={() => onPageChange(Math.min(page + 1, pageCount))}
          >
            {m.packs_next()}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
