import type {
  CreateAuctionRequest,
  CreateOfferRequest,
  SupportedLocale,
  TradeAuctionListResponse,
  TradeAuctionResponse,
  TradeOfferResponse,
} from '@tcg-collection/shared'
import { m } from '@/paraglide/messages'

import { apiFetch } from '@/features/dashboard/lib/api'

type TradeApiPayload = {
  message?: string
  error?: string
}

export async function fetchTradeAuctions(
  locale: SupportedLocale = 'fr',
): Promise<TradeAuctionListResponse> {
  const searchParams = new URLSearchParams({ locale })

  const response = await apiFetch(`/trade/auctions?${searchParams.toString()}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await readTradeError(response, m.trade_fetch_auctions_error()))
  }

  return response.json()
}

export async function fetchTradeAuction(
  auctionId: string,
  locale: SupportedLocale = 'fr',
): Promise<TradeAuctionResponse> {
  const searchParams = new URLSearchParams({ locale })

  const response = await apiFetch(
    `/trade/auctions/${encodeURIComponent(auctionId)}?${searchParams.toString()}`,
    {
      credentials: 'include',
    },
  )

  if (!response.ok) {
    throw new Error(await readTradeError(response, m.trade_fetch_auction_error()))
  }

  return response.json()
}

export async function createTradeAuction(
  input: CreateAuctionRequest,
  locale: SupportedLocale = 'fr',
): Promise<TradeAuctionResponse> {
  const searchParams = new URLSearchParams({ locale })

  const response = await apiFetch(`/trade/auctions?${searchParams.toString()}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await readTradeError(response, m.trade_create_auction_error()))
  }

  return response.json()
}

export async function createTradeOffer(
  auctionId: string,
  input: CreateOfferRequest,
  locale: SupportedLocale = 'fr',
): Promise<TradeOfferResponse> {
  const searchParams = new URLSearchParams({ locale })

  const response = await apiFetch(
    `/trade/auctions/${encodeURIComponent(auctionId)}/offers?${searchParams.toString()}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  )

  if (!response.ok) {
    throw new Error(await readTradeError(response, m.trade_create_offer_error()))
  }

  return response.json()
}

export async function cancelTradeAuction(auctionId: string): Promise<void> {
  const response = await apiFetch(`/trade/auctions/${encodeURIComponent(auctionId)}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await readTradeError(response, m.trade_cancel_auction_error()))
  }
}

export async function cancelTradeOffer(offerId: string): Promise<void> {
  const response = await apiFetch(`/trade/offers/${encodeURIComponent(offerId)}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(await readTradeError(response, m.trade_cancel_offer_error()))
  }
}

export async function acceptTradeOffer(auctionId: string, offerId: string): Promise<void> {
  const response = await apiFetch(
    `/trade/auctions/${encodeURIComponent(auctionId)}/offer/${encodeURIComponent(offerId)}/accept`,
    {
      method: 'POST',
      credentials: 'include',
    },
  )

  if (!response.ok) {
    throw new Error(await readTradeError(response, m.trade_accept_offer_error()))
  }
}

const readTradeError = async (response: Response, fallbackMessage: string): Promise<string> => {
  const raw = await response.text().catch(() => '')
  let payload: TradeApiPayload | undefined

  try {
    payload = raw ? (JSON.parse(raw) as TradeApiPayload) : undefined
  } catch {
    // Keep raw response text for non-json API failures.
  }

  if (payload?.message || payload?.error) {
    return payload?.message ?? payload?.error ?? fallbackMessage
  }

  if (raw && raw.trim().length > 0) {
    return `${fallbackMessage} (${response.status} ${response.statusText})\n${raw.slice(0, 380)}`
  }

  return `${fallbackMessage} (${response.status} ${response.statusText})`
}
