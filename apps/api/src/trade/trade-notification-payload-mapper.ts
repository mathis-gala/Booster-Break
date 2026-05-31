import { Prisma } from '@prisma/client'
import type {
  TradeOfferAcceptedNotificationRecipientRole,
  TradeNotificationCardPayload,
  TradeNotificationPayload,
  TradeOfferAcceptedNotificationPayload,
  TradeOfferReceivedNotificationPayload,
  TradeNotificationType,
} from '@tcg-collection/shared'
import { TradeRepositoryErrorException } from './trade-types'
import { normalizeCardFinish } from './trade-normalizers'

const isPrismaJsonObject = (value: Prisma.JsonValue): value is Prisma.JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const throwInvalidNotificationPayload = (): never => {
  throw new TradeRepositoryErrorException(
    'trade_unavailable',
    'Trade notification payload is invalid',
  )
}

const readString = (source: Prisma.JsonObject, key: string): string => {
  const value = source[key]

  return typeof value === 'string' ? value : throwInvalidNotificationPayload()
}

const readOptionalString = (source: Prisma.JsonObject, key: string): string | undefined => {
  const value = source[key]

  return typeof value === 'string' ? value : undefined
}

const readNumber = (source: Prisma.JsonObject, key: string): number => {
  const value = source[key]

  return typeof value === 'number' ? value : throwInvalidNotificationPayload()
}

const readAcceptedRecipientRole = (
  source: Prisma.JsonObject,
): TradeOfferAcceptedNotificationRecipientRole | undefined => {
  const value = source.recipientRole

  return value === 'auction_creator' || value === 'offer_proposer' ? value : undefined
}

const readJsonObject = (source: Prisma.JsonObject, key: string): Prisma.JsonObject => {
  const value = source[key]

  return value !== undefined && isPrismaJsonObject(value)
    ? value
    : throwInvalidNotificationPayload()
}

const readJsonObjectArray = (source: Prisma.JsonObject, key: string): Prisma.JsonObject[] => {
  const value = source[key]

  return Array.isArray(value) && value.every(isPrismaJsonObject)
    ? value
    : throwInvalidNotificationPayload()
}

const toTradeNotificationCardPayload = (
  payload: Prisma.JsonObject,
): TradeNotificationCardPayload => {
  const finish = normalizeCardFinish(readString(payload, 'finish')) ?? throwInvalidNotificationPayload()

  const cardPayload: TradeNotificationCardPayload = {
    cardId: readString(payload, 'cardId'),
    name: readString(payload, 'name'),
    finish,
    quantity: readNumber(payload, 'quantity'),
  }
  const imageSmall = readOptionalString(payload, 'imageSmall')
  const imageLarge = readOptionalString(payload, 'imageLarge')
  const setId = readOptionalString(payload, 'setId')
  const number = readOptionalString(payload, 'number')

  if (imageSmall) {
    cardPayload.imageSmall = imageSmall
  }

  if (imageLarge) {
    cardPayload.imageLarge = imageLarge
  }

  if (setId) {
    cardPayload.setId = setId
  }

  if (number) {
    cardPayload.number = number
  }

  return cardPayload
}

export const toTradeNotificationPayload = (
  type: TradeNotificationType,
  payload: Prisma.JsonValue,
): TradeNotificationPayload => {
  const payloadObject = isPrismaJsonObject(payload) ? payload : throwInvalidNotificationPayload()

  if (type === 'trade_offer_accepted') {
    const acceptedPayload: TradeOfferAcceptedNotificationPayload = {
      offerId: readString(payloadObject, 'offerId'),
      auctionId: readString(payloadObject, 'auctionId'),
      proposerId: readString(payloadObject, 'proposerId'),
      proposerPseudo: readString(payloadObject, 'proposerPseudo'),
      offeredCard: toTradeNotificationCardPayload(readJsonObject(payloadObject, 'offeredCard')),
      exchangedCards: readJsonObjectArray(payloadObject, 'exchangedCards').map(
        toTradeNotificationCardPayload,
      ),
    }
    const proposerDisplayName = readOptionalString(payloadObject, 'proposerDisplayName')
    const proposerAvatarUrl = readOptionalString(payloadObject, 'proposerAvatarUrl')
    const offeredTo = readOptionalString(payloadObject, 'offeredTo')
    const recipientRole = readAcceptedRecipientRole(payloadObject)
    const creatorId = readOptionalString(payloadObject, 'creatorId')
    const creatorPseudo = readOptionalString(payloadObject, 'creatorPseudo')
    const creatorDisplayName = readOptionalString(payloadObject, 'creatorDisplayName')
    const creatorAvatarUrl = readOptionalString(payloadObject, 'creatorAvatarUrl')

    if (recipientRole) {
      acceptedPayload.recipientRole = recipientRole
    }

    if (creatorId) {
      acceptedPayload.creatorId = creatorId
    }

    if (creatorPseudo) {
      acceptedPayload.creatorPseudo = creatorPseudo
    }

    if (creatorDisplayName) {
      acceptedPayload.creatorDisplayName = creatorDisplayName
    }

    if (creatorAvatarUrl) {
      acceptedPayload.creatorAvatarUrl = creatorAvatarUrl
    }

    if (proposerDisplayName) {
      acceptedPayload.proposerDisplayName = proposerDisplayName
    }

    if (proposerAvatarUrl) {
      acceptedPayload.proposerAvatarUrl = proposerAvatarUrl
    }

    if (offeredTo) {
      acceptedPayload.offeredTo = offeredTo
    }

    return acceptedPayload
  }

  const receivedPayload: TradeOfferReceivedNotificationPayload = {
    offerId: readString(payloadObject, 'offerId'),
    auctionId: readString(payloadObject, 'auctionId'),
    proposerId: readString(payloadObject, 'proposerId'),
    proposerPseudo: readString(payloadObject, 'proposerPseudo'),
    offeredCard: toTradeNotificationCardPayload(readJsonObject(payloadObject, 'offeredCard')),
    offeredCards: readJsonObjectArray(payloadObject, 'offeredCards').map(
      toTradeNotificationCardPayload,
    ),
  }
  const proposerDisplayName = readOptionalString(payloadObject, 'proposerDisplayName')
  const proposerAvatarUrl = readOptionalString(payloadObject, 'proposerAvatarUrl')

  if (proposerDisplayName) {
    receivedPayload.proposerDisplayName = proposerDisplayName
  }

  if (proposerAvatarUrl) {
    receivedPayload.proposerAvatarUrl = proposerAvatarUrl
  }

  return receivedPayload
}

const toPrismaNotificationCardPayload = (
  payload: TradeNotificationCardPayload,
): Prisma.InputJsonObject => ({
  cardId: payload.cardId,
  name: payload.name,
  finish: payload.finish,
  quantity: payload.quantity,
  ...(payload.imageSmall !== undefined ? { imageSmall: payload.imageSmall } : {}),
  ...(payload.imageLarge !== undefined ? { imageLarge: payload.imageLarge } : {}),
  ...(payload.setId !== undefined ? { setId: payload.setId } : {}),
  ...(payload.number !== undefined ? { number: payload.number } : {}),
})

export const toPrismaNotificationPayload = (
  payload: TradeNotificationPayload,
): Prisma.InputJsonObject => {
  const commonPayload = {
    offerId: payload.offerId,
    auctionId: payload.auctionId,
    proposerId: payload.proposerId,
    proposerPseudo: payload.proposerPseudo,
    offeredCard: toPrismaNotificationCardPayload(payload.offeredCard),
    ...(payload.proposerDisplayName !== undefined
      ? { proposerDisplayName: payload.proposerDisplayName }
      : {}),
    ...(payload.proposerAvatarUrl !== undefined
      ? { proposerAvatarUrl: payload.proposerAvatarUrl }
      : {}),
  }

  if ('exchangedCards' in payload) {
    return {
      ...commonPayload,
      ...(payload.recipientRole !== undefined ? { recipientRole: payload.recipientRole } : {}),
      ...(payload.creatorId !== undefined ? { creatorId: payload.creatorId } : {}),
      ...(payload.creatorPseudo !== undefined ? { creatorPseudo: payload.creatorPseudo } : {}),
      ...(payload.creatorDisplayName !== undefined
        ? { creatorDisplayName: payload.creatorDisplayName }
        : {}),
      ...(payload.creatorAvatarUrl !== undefined
        ? { creatorAvatarUrl: payload.creatorAvatarUrl }
        : {}),
      exchangedCards: payload.exchangedCards.map(toPrismaNotificationCardPayload),
      ...(payload.offeredTo !== undefined ? { offeredTo: payload.offeredTo } : {}),
    }
  }

  return {
    ...commonPayload,
    offeredCards: payload.offeredCards.map(toPrismaNotificationCardPayload),
  }
}
