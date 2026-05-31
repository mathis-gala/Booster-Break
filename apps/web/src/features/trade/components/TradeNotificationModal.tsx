import { CheckCircle2Icon, Clock3Icon, UserRoundIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import type { TradeNotificationCardPayload, TradeNotificationResponse } from '@tcg-collection/shared'
import { Button } from '@/components/ui/button'
import { FoilCardImage } from '@/features/dashboard/components/FoilCardImage'
import { m } from '@/paraglide/messages'

interface TradeNotificationModalProps {
  notification: TradeNotificationResponse
  onClose: () => void
}

interface NotificationCardListProps {
  title: string
  cards: TradeNotificationCardPayload[] | undefined
}

const NotificationCardList = ({ title, cards }: NotificationCardListProps) => {
  if (!cards || cards.length === 0) {
    return null
  }

  return (
    <div className="mt-2 rounded-md border border-border/60 bg-card/40 p-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {cards.map((card) => (
          <article
            key={`${card.cardId}-${card.finish}-${card.quantity}`}
            className="inline-flex w-40 min-w-0 flex-col items-center gap-1 rounded-lg border bg-card p-2 text-center"
          >
            {card.imageSmall ? (
              <FoilCardImage
                src={card.imageSmall}
                alt={card.name}
                finish={card.finish}
                className="aspect-[63/88] w-28 rounded-md"
              />
            ) : (
              <div className="aspect-[63/88] w-28 rounded-md bg-muted" aria-hidden="true" />
            )}
            <p className="w-full min-w-0 break-words text-xs font-black leading-tight">
              {card.name}
            </p>
            <p className="text-xs text-muted-foreground">x{card.quantity}</p>
          </article>
        ))}
      </div>
    </div>
  )
}

const NotificationAvatar = ({
  name,
  avatarUrl,
  label,
}: {
  name: string
  avatarUrl?: string
  label: string
}) => (
  <div className="flex items-center gap-3 rounded-md border bg-card/40 p-2">
    {avatarUrl ? (
      <img
        src={avatarUrl}
        alt=""
        className="size-10 rounded-full border border-sidebar-accent/50 object-cover"
      />
    ) : (
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-sidebar-accent/50 bg-sidebar-accent/10">
        <UserRoundIcon className="size-5 text-sidebar-accent" aria-hidden="true" />
      </span>
    )}
    <div className="min-w-0">
      <p className="break-words text-sm font-black">{name}</p>
      <p className="break-words text-xs text-muted-foreground">{label}</p>
    </div>
  </div>
)

interface ModalShellProps {
  title: string
  message: string
  details?: string
  onClose: () => void
  children?: ReactNode
}

const ModalShell = ({ title, message, details, children, onClose }: ModalShellProps) => (
  <div
    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/78 p-3 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-label={title}
    onClick={onClose}
  >
    <div
      className="w-full max-w-lg rounded-lg border bg-background p-4 shadow-2xl"
      onClick={(event) => {
        event.stopPropagation()
      }}
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <CheckCircle2Icon className="mt-0.5 size-6 text-green-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="break-words text-sm font-black">{title}</p>
            <p className="mt-1 break-words text-sm text-muted-foreground">{message}</p>
          </div>
        </div>

        {children}

        {details ? (
          <div className="min-w-0 rounded-md border border-border/60 bg-card/30 px-3 py-2 text-xs text-muted-foreground">
            <p className="flex min-w-0 items-start gap-1 break-words">
              <Clock3Icon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              {details}
            </p>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="button" onClick={onClose}>
            {m.trade_notification_confirm()}
          </Button>
        </div>
      </div>
    </div>
  </div>
)

const assertUnreachable = (value: never): never => {
  throw new Error(`Unhandled trade notification type: ${value}`)
}

const renderTradeOfferAcceptedNotification = (
  notification: Extract<TradeNotificationResponse, { type: 'trade_offer_accepted' }>,
  onClose: () => void,
) => {
  const isAuctionCreatorNotification = notification.payload.recipientRole === 'auction_creator'
  const proposerName =
    notification.payload.proposerDisplayName?.trim() ?? notification.payload.proposerPseudo
  const hasCreatorName = Boolean(
    notification.payload.creatorDisplayName?.trim() || notification.payload.creatorPseudo,
  )
  const creatorName =
    notification.payload.creatorDisplayName?.trim() ??
    notification.payload.creatorPseudo ??
    m.trade_notification_trade_partner()
  const actorName = isAuctionCreatorNotification ? proposerName : creatorName
  const actorAvatarUrl = isAuctionCreatorNotification
    ? notification.payload.proposerAvatarUrl
    : notification.payload.creatorAvatarUrl
  const actorLabel = isAuctionCreatorNotification
    ? m.trade_notification_offer_accepted_sender()
    : m.trade_notification_offer_accepted_by()
  const receivedCards = isAuctionCreatorNotification
    ? notification.payload.exchangedCards
    : [notification.payload.offeredCard]
  const givenCards = isAuctionCreatorNotification
    ? [notification.payload.offeredCard]
    : notification.payload.exchangedCards

  return (
    <ModalShell
      title={m.trade_notification_offer_accepted_title()}
      message={
        isAuctionCreatorNotification
          ? m.trade_notification_offer_accepted_creator_message({ proposer: proposerName })
          : hasCreatorName
            ? m.trade_notification_offer_accepted_proposer_message({ creator: creatorName })
            : m.trade_notification_offer_accepted_fallback_message()
      }
      onClose={onClose}
    >
      {isAuctionCreatorNotification || hasCreatorName ? (
        <NotificationAvatar
          name={actorName}
          avatarUrl={actorAvatarUrl}
          label={actorLabel}
        />
      ) : null}
      <NotificationCardList
        title={m.trade_notification_received_cards()}
        cards={receivedCards}
      />
      <NotificationCardList
        title={
          givenCards.length === 1
            ? m.trade_notification_given_card()
            : m.trade_notification_given_cards()
        }
        cards={givenCards}
      />
    </ModalShell>
  )
}

const renderTradeOfferReceivedNotification = (
  notification: Extract<TradeNotificationResponse, { type: 'trade_offer_received' }>,
  onClose: () => void,
) => {
  const proposerName =
    notification.payload.proposerDisplayName?.trim() ?? notification.payload.proposerPseudo

  return (
    <ModalShell
      title={m.trade_notification_offer_received_title()}
      message={m.trade_notification_offer_received_message({ proposer: proposerName })}
      onClose={onClose}
    >
      <NotificationAvatar
        name={proposerName}
        avatarUrl={notification.payload.proposerAvatarUrl}
        label={m.trade_notification_offer_received_sender()}
      />
      <NotificationCardList
        title={m.trade_notification_offer_cards()}
        cards={notification.payload.offeredCards}
      />
      <NotificationCardList
        title={m.trade_notification_given_card()}
        cards={[notification.payload.offeredCard]}
      />
    </ModalShell>
  )
}

export function TradeNotificationModal({ notification, onClose }: TradeNotificationModalProps) {
  switch (notification.type) {
    case 'trade_offer_accepted':
      return renderTradeOfferAcceptedNotification(notification, onClose)
    case 'trade_offer_received':
      return renderTradeOfferReceivedNotification(notification, onClose)
    default:
      return assertUnreachable(notification)
  }
}
