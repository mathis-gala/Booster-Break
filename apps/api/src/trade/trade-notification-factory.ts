import type {
  TradeOfferAcceptedNotificationPayload,
  TradeOfferReceivedNotificationPayload,
} from '@tcg-collection/shared'
import type { TradeOfferRow, TradeRepositoryNotificationInput } from './trade-types'

export const buildTradeOfferAcceptedNotificationInput = (
  offer: TradeOfferRow,
): TradeRepositoryNotificationInput => {
  const proposerDisplayName = offer.proposer.displayName?.trim()
    ? offer.proposer.displayName
    : undefined
  const offeredCard = offer.auction?.offeredCard

  if (!offer.auction || !offeredCard) {
    throw new Error('Accepted offer has no auction card context')
  }

  const creatorDisplayName = offer.auction.creator?.displayName?.trim()
    ? offer.auction.creator.displayName
    : undefined

  const payload: TradeOfferAcceptedNotificationPayload = {
    offerId: offer.id,
    auctionId: offer.auctionId,
    recipientRole: 'offer_proposer',
    creatorId: offer.auction.creatorId,
    creatorPseudo: offer.auction.creator?.pseudo ?? 'Unknown player',
    creatorDisplayName,
    creatorAvatarUrl: offer.auction.creator?.avatarUrl ?? undefined,
    proposerId: offer.proposerId,
    proposerPseudo: offer.proposer.pseudo,
    proposerDisplayName,
    proposerAvatarUrl: offer.proposer.avatarUrl ?? undefined,
    offeredCard: {
      cardId: offer.auction.offeredCardId,
      name: offeredCard.name,
      imageSmall: offeredCard.imageSmall ?? undefined,
      imageLarge: offeredCard.imageLarge ?? undefined,
      finish: offer.auction.offeredCardFinish,
      quantity: 1,
      setId: offeredCard.setId,
      number: offeredCard.localId,
    },
    exchangedCards: offer.cards.map((card) => ({
      cardId: card.card.id,
      name: card.card.name,
      imageSmall: card.card.imageSmall ?? undefined,
      imageLarge: card.card.imageLarge ?? undefined,
      finish: card.finish,
      quantity: card.quantity,
      setId: card.card.setId,
      number: card.card.localId,
    })),
  }

  return {
    userId: offer.proposerId,
    type: 'trade_offer_accepted',
    message: 'Your trade offer has been accepted and executed.',
    payload,
  }
}

export const buildTradeOfferReceivedNotificationInput = (
  offer: TradeOfferRow,
): TradeRepositoryNotificationInput => {
  const proposerDisplayName = offer.proposer.displayName?.trim()
    ? offer.proposer.displayName
    : undefined
  const proposerName = proposerDisplayName ?? offer.proposer.pseudo
  const auction = offer.auction
  const offeredCard = auction?.offeredCard

  if (!auction || !offeredCard) {
    throw new Error('Received offer has no auction card context')
  }

  const payload: TradeOfferReceivedNotificationPayload = {
    offerId: offer.id,
    auctionId: offer.auctionId,
    proposerId: offer.proposerId,
    proposerPseudo: offer.proposer.pseudo,
    proposerDisplayName,
    proposerAvatarUrl: offer.proposer.avatarUrl ?? undefined,
    offeredCard: {
      cardId: auction.offeredCardId,
      name: offeredCard.name,
      imageSmall: offeredCard.imageSmall ?? undefined,
      imageLarge: offeredCard.imageLarge ?? undefined,
      finish: auction.offeredCardFinish,
      quantity: 1,
      setId: offeredCard.setId,
      number: offeredCard.localId,
    },
    offeredCards: offer.cards.map((card) => ({
      cardId: card.card.id,
      name: card.card.name,
      imageSmall: card.card.imageSmall ?? undefined,
      imageLarge: card.card.imageLarge ?? undefined,
      finish: card.finish,
      quantity: card.quantity,
      setId: card.card.setId,
      number: card.card.localId,
    })),
  }

  return {
    userId: auction.creatorId,
    type: 'trade_offer_received',
    message: `${proposerName} submitted an offer for your auction.`,
    payload,
  }
}
