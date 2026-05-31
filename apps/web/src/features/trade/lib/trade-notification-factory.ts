import type {
  TradeAuctionResponse,
  TradeNotificationCardPayload,
  TradeNotificationResponse,
  TradeOfferResponse,
} from '@tcg-collection/shared'
import { m } from '@/paraglide/messages'

const toTradeNotificationCardPayload = (
  card: TradeOfferResponse['cards'][number],
): TradeNotificationCardPayload => ({
  cardId: card.card.id,
  name: card.card.name,
  imageSmall: card.card.imageSmall,
  imageLarge: card.card.imageLarge,
  finish: card.finish,
  quantity: card.quantity,
  setId: card.card.setId,
  number: card.card.number,
})

export const buildAcceptedOfferNotification = (
  auction: TradeAuctionResponse,
  offer: TradeOfferResponse,
): TradeNotificationResponse => {
  const proposerName = offer.proposerDisplayName?.trim() ?? offer.proposerPseudo

  return {
    id: `accepted-offer-${offer.id}`,
    type: 'trade_offer_accepted',
    message: m.trade_notification_offer_accepted_creator_message({ proposer: proposerName }),
    payload: {
      offerId: offer.id,
      auctionId: auction.id,
      recipientRole: 'auction_creator',
      creatorId: auction.creatorId,
      creatorPseudo: auction.creatorPseudo,
      creatorDisplayName: auction.creatorDisplayName,
      creatorAvatarUrl: auction.creatorAvatarUrl,
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
      exchangedCards: offer.cards.map(toTradeNotificationCardPayload),
    },
    viewed: false,
    createdAt: new Date().toISOString(),
  }
}
