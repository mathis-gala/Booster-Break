import { describe, expect, test } from 'bun:test'

import {
  buildTradeOfferAcceptedNotificationInput,
  buildTradeOfferReceivedNotificationInput,
} from '../../src/trade/trade-notification-factory'
import { toTradeNotificationResponse } from '../../src/trade/trade-mappers'
import type {
  TradeAuctionCardSummary,
  TradeNotificationRow,
  TradeOfferRow,
} from '../../src/trade/trade-types'

const offeredCard: TradeAuctionCardSummary = {
  id: 'me01-177',
  setId: 'me01',
  name: 'Mega Venusaur ex',
  nameEn: 'Mega Venusaur ex',
  nameFr: 'Méga-Florizarre-ex',
  localId: '177',
  rarity: 'Special Illustration Rare',
  category: 'Pokémon',
  rawJson: JSON.stringify({ stage: 'Stage1', evolveFrom: 'Ivysaur' }),
  imageSmall: 'small.png',
  imageLarge: 'large.png',
}

const exchangedCard: TradeAuctionCardSummary = {
  ...offeredCard,
  id: 'sv08.5-116',
  setId: 'sv08.5',
  name: 'Max Rod',
  localId: '116',
  rarity: 'ACE SPEC Rare',
  category: 'Trainer',
  rawJson: '{}',
}

const offer: TradeOfferRow = {
  id: 'offer-1',
  auctionId: 'auction-1',
  proposerId: 'proposer-1',
  status: 'pending',
  createdAt: new Date('2026-08-03T12:00:00Z'),
  updatedAt: new Date('2026-08-03T12:00:00Z'),
  proposer: {
    id: 'proposer-1',
    pseudo: 'proposer',
    displayName: null,
    avatarUrl: null,
  },
  auction: {
    id: 'auction-1',
    creatorId: 'creator-1',
    status: 'active',
    offeredCardId: offeredCard.id,
    offeredCardFinish: 'holo',
    expiresAt: new Date('2026-08-04T12:00:00Z'),
    creator: {
      id: 'creator-1',
      pseudo: 'creator',
      displayName: null,
      avatarUrl: null,
    },
    offeredCard,
  },
  cards: [
    {
      offerId: 'offer-1',
      cardId: exchangedCard.id,
      finish: 'holo',
      quantity: 1,
      card: exchangedCard,
    },
  ],
}

describe('trade notification foil metadata', () => {
  test('snapshots rarity and supertype for received offers', () => {
    const notification = buildTradeOfferReceivedNotificationInput(offer)

    expect(notification.payload.offeredCard).toMatchObject({
      rarity: 'Special Illustration Rare',
      supertype: 'Pokémon',
      isEvolved: true,
    })
    expect('offeredCards' in notification.payload).toBeTrue()
    if ('offeredCards' in notification.payload) {
      expect(notification.payload.offeredCards[0]).toMatchObject({
        rarity: 'ACE SPEC Rare',
        supertype: 'Trainer',
        isEvolved: undefined,
      })
    }
  })

  test('snapshots rarity and supertype for accepted offers', () => {
    const notification = buildTradeOfferAcceptedNotificationInput(offer)

    expect('exchangedCards' in notification.payload).toBeTrue()
    if ('exchangedCards' in notification.payload) {
      expect(notification.payload.exchangedCards[0]).toMatchObject({
        rarity: 'ACE SPEC Rare',
        supertype: 'Trainer',
        isEvolved: undefined,
      })
    }
  })

  test('keeps stored foil metadata when a live card row is incomplete', () => {
    const input = buildTradeOfferReceivedNotificationInput(offer)
    const row: TradeNotificationRow = {
      id: 'notification-1',
      userId: input.userId,
      type: input.type,
      message: input.message,
      payload: input.payload,
      viewed: false,
      createdAt: new Date('2026-08-03T12:00:00Z'),
      updatedAt: new Date('2026-08-03T12:00:00Z'),
    }
    const response = toTradeNotificationResponse(
      row,
      new Map([[offeredCard.id, { ...offeredCard, rarity: null, category: null }]]),
      'en',
    )

    expect(response.payload.offeredCard).toMatchObject({
      rarity: 'Special Illustration Rare',
      supertype: 'Pokémon',
      isEvolved: true,
    })
  })
})
