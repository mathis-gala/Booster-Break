import { afterAll, expect, test } from 'bun:test'
import type { AuthUser } from '../../src/auth/types'
import type { AppPrisma } from '../../src/db/prisma'
import { PrismaTradeRepository } from '../../src/trade/trade-repository'
import { TradeService } from '../../src/trade/trade-service'

const databaseTest = Bun.env.RUN_DATABASE_TESTS === 'true' ? test : test.skip

const assertDisposableTestDatabase = (): void => {
  const databaseUrl = Bun.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for database integration tests')
  }

  const url = new URL(databaseUrl)
  const databaseName = url.pathname.slice(1)
  const isLoopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost'

  if (!isLoopback || !databaseName.endsWith('_test')) {
    throw new Error('Trade integration tests require a loopback database ending in _test')
  }
}

databaseTest('rolls back an offer when its durable notification cannot be created', async () => {
  const fixture = await createTradeFixture()
  const removeFailure = await failNotificationInsert(
    fixture.prisma,
    'trade_offer_received',
    fixture.suffix,
  )

  try {
    const result = await fixture.service.createOffer(fixture.proposer, fixture.auctionId, {
      cards: [{ cardId: fixture.offerCardId, finish: 'normal', quantity: 1 }],
    })

    expect(result).toMatchObject({ error: 'trade_unavailable' })

    const currentAuction = await fixture.service.getAuction(
      fixture.auctionId,
      'en',
      fixture.creator,
    )
    expect(currentAuction).not.toHaveProperty('error')
    if (!('error' in currentAuction)) {
      expect(currentAuction.offerCount).toBe(0)
      expect(currentAuction.offers).toEqual([])
    }
  } finally {
    await removeFailure()
    await fixture.cleanup()
  }
})

databaseTest(
  'rolls back an accepted trade when its durable notification cannot be created',
  async () => {
    const fixture = await createTradeFixture()

    try {
      const offer = await fixture.service.createOffer(fixture.proposer, fixture.auctionId, {
        cards: [{ cardId: fixture.offerCardId, finish: 'normal', quantity: 1 }],
      })
      expect(offer).not.toHaveProperty('error')
      if ('error' in offer) {
        return
      }

      const removeFailure = await failNotificationInsert(
        fixture.prisma,
        'trade_offer_accepted',
        fixture.suffix,
      )

      try {
        const result = await fixture.service.acceptOffer(
          fixture.creator,
          fixture.auctionId,
          offer.id,
        )

        expect(result).toMatchObject({ error: 'trade_unavailable' })

        const currentAuction = await fixture.service.getAuction(
          fixture.auctionId,
          'en',
          fixture.creator,
        )
        expect(currentAuction).not.toHaveProperty('error')
        if (!('error' in currentAuction)) {
          expect(currentAuction.status).toBe('active')
          expect(currentAuction.offers).toEqual([
            expect.objectContaining({ id: offer.id, status: 'pending' }),
          ])
        }
      } finally {
        await removeFailure()
      }
    } finally {
      await fixture.cleanup()
    }
  },
)

databaseTest('serializes identical offers into one offer and one notification', async () => {
  const fixture = await createTradeFixture()

  try {
    const submit = () =>
      fixture.service.createOffer(fixture.proposer, fixture.auctionId, {
        cards: [{ cardId: fixture.offerCardId, finish: 'normal', quantity: 1 }],
      })
    const results = await Promise.all([submit(), submit()])

    expect(results.filter((result) => !('error' in result))).toHaveLength(1)
    expect(results.filter((result) => 'error' in result)).toEqual([
      expect.objectContaining({ error: 'duplicate_offer' }),
    ])

    const currentAuction = await fixture.service.getAuction(
      fixture.auctionId,
      'en',
      fixture.creator,
    )
    expect(currentAuction).not.toHaveProperty('error')
    if (!('error' in currentAuction)) {
      expect(currentAuction.offerCount).toBe(1)
      expect(currentAuction.offers).toHaveLength(1)
    }

    const notifications = await fixture.service.listTradeNotifications(fixture.creator)
    expect(notifications).not.toHaveProperty('error')
    if (!('error' in notifications)) {
      expect(notifications.notifications).toHaveLength(1)
      expect(notifications.notifications[0]?.type).toBe('trade_offer_received')
    }
  } finally {
    await fixture.cleanup()
  }
})

databaseTest('allows different owners to auction the same card type', async () => {
  const fixture = await createTradeFixture()
  const otherCreatorId = `other-creator-${fixture.suffix}`

  try {
    await fixture.prisma.user.create({
      data: {
        id: otherCreatorId,
        pseudo: 'other-creator',
        slackUserId: `other-creator-${fixture.suffix}`,
        cards: {
          create: {
            cardId: fixture.auctionCardId,
            finish: 'normal',
            quantity: 1,
            firstCollectedAt: new Date(),
            updatedAt: new Date(),
          },
        },
      },
    })

    const result = await fixture.service.createAuction(
      { id: otherCreatorId, pseudo: 'other-creator' },
      { offeredCardId: fixture.auctionCardId, offeredCardFinish: 'normal' },
    )

    expect(result).not.toHaveProperty('error')
  } finally {
    await fixture.prisma.user.deleteMany({ where: { id: otherCreatorId } })
    await fixture.cleanup()
  }
})

databaseTest('keeps cancellation authorization and transition inside the command', async () => {
  const fixture = await createTradeFixture()

  try {
    const offer = await fixture.service.createOffer(fixture.proposer, fixture.auctionId, {
      cards: [{ cardId: fixture.offerCardId, finish: 'normal', quantity: 1 }],
    })
    expect(offer).not.toHaveProperty('error')
    if ('error' in offer) {
      return
    }

    const unauthorized = await fixture.service.cancelOffer(
      { id: `stranger-${fixture.suffix}`, pseudo: 'stranger' },
      offer.id,
    )
    expect(unauthorized).toMatchObject({ error: 'offer_not_owned' })

    const cancelled = await fixture.service.cancelOffer(fixture.creator, offer.id)
    expect(cancelled).toBeUndefined()

    const currentAuction = await fixture.service.getAuction(
      fixture.auctionId,
      'en',
      fixture.creator,
    )
    expect(currentAuction).not.toHaveProperty('error')
    if (!('error' in currentAuction)) {
      expect(currentAuction.offers).toEqual([
        expect.objectContaining({ id: offer.id, status: 'rejected' }),
      ])
    }
  } finally {
    await fixture.cleanup()
  }
})

databaseTest('expires pending offers with their auction', async () => {
  const fixture = await createTradeFixture()

  try {
    const offer = await fixture.service.createOffer(fixture.proposer, fixture.auctionId, {
      cards: [{ cardId: fixture.offerCardId, finish: 'normal', quantity: 1 }],
    })
    expect(offer).not.toHaveProperty('error')
    if ('error' in offer) {
      return
    }

    await fixture.prisma.tradeAuction.update({
      where: { id: fixture.auctionId },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    })

    const currentAuction = await fixture.service.getAuction(
      fixture.auctionId,
      'en',
      fixture.creator,
    )
    expect(currentAuction).not.toHaveProperty('error')
    if (!('error' in currentAuction)) {
      expect(currentAuction.status).toBe('expired')
      expect(currentAuction.offers).toEqual([
        expect.objectContaining({ id: offer.id, status: 'cancelled' }),
      ])
    }
  } finally {
    await fixture.cleanup()
  }
})

databaseTest('rejects an unauthorized accept without changing trade state', async () => {
  const fixture = await createTradeFixture()

  try {
    const offer = await fixture.service.createOffer(fixture.proposer, fixture.auctionId, {
      cards: [{ cardId: fixture.offerCardId, finish: 'normal', quantity: 1 }],
    })
    expect(offer).not.toHaveProperty('error')
    if ('error' in offer) {
      return
    }

    const result = await fixture.service.acceptOffer(fixture.proposer, fixture.auctionId, offer.id)
    expect(result).toMatchObject({ error: 'auction_not_owned' })

    const currentAuction = await fixture.service.getAuction(
      fixture.auctionId,
      'en',
      fixture.creator,
    )
    expect(currentAuction).not.toHaveProperty('error')
    if (!('error' in currentAuction)) {
      expect(currentAuction.status).toBe('active')
      expect(currentAuction.offers).toEqual([
        expect.objectContaining({ id: offer.id, status: 'pending' }),
      ])
    }
  } finally {
    await fixture.cleanup()
  }
})

const createTradeFixture = async () => {
  assertDisposableTestDatabase()
  const { prisma } = await import('../../src/db/prisma')
  const suffix = crypto.randomUUID()
  const creatorId = `creator-${suffix}`
  const proposerId = `proposer-${suffix}`
  const setId = `set-${suffix}`
  const auctionCardId = `auction-card-${suffix}`
  const offerCardId = `offer-card-${suffix}`
  const auctionId = `auction-${suffix}`

  await prisma.pokemonSet.create({
    data: {
      id: setId,
      name: 'Trade test set',
      series: 'Trade tests',
      total: 2,
      releaseDate: '2026-07-14',
      rawJson: '{}',
      syncedAt: new Date().toISOString(),
      cards: {
        create: [
          {
            id: auctionCardId,
            localId: '1',
            name: 'Auction card',
            rawJson: '{}',
            syncedAt: new Date().toISOString(),
          },
          {
            id: offerCardId,
            localId: '2',
            name: 'Offer card',
            rawJson: '{}',
            syncedAt: new Date().toISOString(),
          },
        ],
      },
    },
  })
  await prisma.user.createMany({
    data: [
      { id: creatorId, pseudo: 'creator', slackUserId: `creator-${suffix}` },
      { id: proposerId, pseudo: 'proposer', slackUserId: `proposer-${suffix}` },
    ],
  })
  await prisma.userCard.createMany({
    data: [
      {
        userId: creatorId,
        cardId: auctionCardId,
        finish: 'normal',
        quantity: 1,
        firstCollectedAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: proposerId,
        cardId: offerCardId,
        finish: 'normal',
        quantity: 1,
        firstCollectedAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  })
  await prisma.tradeAuction.create({
    data: {
      id: auctionId,
      creatorId,
      offeredCardId: auctionCardId,
      offeredCardFinish: 'normal',
      requirements: {},
      filters: {},
      expiresAt: new Date(Date.now() + 60_000),
    },
  })

  const creator: AuthUser = { id: creatorId, pseudo: 'creator' }
  const proposer: AuthUser = { id: proposerId, pseudo: 'proposer' }

  return {
    prisma,
    suffix,
    creator,
    proposer,
    auctionId,
    auctionCardId,
    offerCardId,
    service: new TradeService({ tradeRepository: new PrismaTradeRepository(prisma) }),
    cleanup: async () => {
      await prisma.user.deleteMany({ where: { id: { in: [creatorId, proposerId] } } })
      await prisma.pokemonSet.delete({ where: { id: setId } })
    },
  }
}

const failNotificationInsert = async (
  prisma: AppPrisma,
  notificationType: string,
  suffix: string,
): Promise<() => Promise<void>> => {
  const identifier = suffix.replaceAll('-', '_')
  const functionName = `fail_trade_notification_${identifier}`
  const triggerName = `fail_trade_notification_trigger_${identifier}`

  await prisma.$executeRawUnsafe(`
    CREATE FUNCTION ${functionName}()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.type = '${notificationType}' THEN
        RAISE EXCEPTION 'forced notification failure';
      END IF;
      RETURN NEW;
    END;
    $$
  `)
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER ${triggerName}
    BEFORE INSERT ON trade_notifications
    FOR EACH ROW EXECUTE FUNCTION ${functionName}()
  `)

  return async () => {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${triggerName} ON trade_notifications`)
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${functionName}()`)
  }
}

afterAll(async () => {
  if (Bun.env.RUN_DATABASE_TESTS === 'true') {
    const { prisma } = await import('../../src/db/prisma')
    await prisma.$disconnect()
  }
})
