DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TradeAuctionStatus') THEN
    CREATE TYPE "TradeAuctionStatus" AS ENUM ('active', 'accepted', 'cancelled', 'expired');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TradeOfferStatus') THEN
    CREATE TYPE "TradeOfferStatus" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL,
  "pseudo" TEXT NOT NULL,
  "display_name" TEXT,
  "avatar_url" TEXT,
  "slack_user_id" TEXT NOT NULL,
  "slack_team_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_slack_user_id_key" ON "users"("slack_user_id");

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "pokemon_sets" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "name_en" TEXT,
  "name_fr" TEXT,
  "series" TEXT NOT NULL,
  "series_en" TEXT,
  "series_fr" TEXT,
  "total" INTEGER NOT NULL,
  "release_date" TEXT NOT NULL,
  "symbol_url" TEXT,
  "logo_url" TEXT,
  "booster_image_url" TEXT,
  "raw_json" TEXT NOT NULL,
  "synced_at" TEXT NOT NULL,

  CONSTRAINT "pokemon_sets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pokemon_cards" (
  "id" TEXT NOT NULL,
  "set_id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "name_en" TEXT,
  "name_fr" TEXT,
  "rarity" TEXT,
  "supertype" TEXT,
  "image_small" TEXT,
  "image_large" TEXT,
  "raw_json" TEXT NOT NULL,
  "synced_at" TEXT NOT NULL,

  CONSTRAINT "pokemon_cards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pokemon_cards_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "pokemon_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "pokemon_cards_set_id_idx" ON "pokemon_cards"("set_id");

CREATE TABLE IF NOT EXISTS "user_cards" (
  "user_id" TEXT NOT NULL,
  "card_id" TEXT NOT NULL,
  "finish" TEXT NOT NULL DEFAULT 'normal',
  "quantity" INTEGER NOT NULL,
  "first_collected_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_cards_pkey" PRIMARY KEY ("user_id", "card_id", "finish"),
  CONSTRAINT "user_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_cards_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "pokemon_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "pack_openings" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "set_id" TEXT NOT NULL,
  "opened_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "pack_openings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pack_openings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pack_openings_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "pokemon_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "pack_opening_cards" (
  "pack_opening_id" TEXT NOT NULL,
  "card_id" TEXT NOT NULL,
  "finish" TEXT NOT NULL DEFAULT 'normal',
  "position" INTEGER NOT NULL,

  CONSTRAINT "pack_opening_cards_pkey" PRIMARY KEY ("pack_opening_id", "position"),
  CONSTRAINT "pack_opening_cards_pack_opening_id_fkey" FOREIGN KEY ("pack_opening_id") REFERENCES "pack_openings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pack_opening_cards_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "pokemon_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "trade_auctions" (
  "id" TEXT NOT NULL,
  "creator_id" TEXT NOT NULL,
  "offered_card_id" TEXT NOT NULL,
  "offered_card_finish" TEXT NOT NULL DEFAULT 'normal',
  "requirements" JSONB NOT NULL,
  "filters" JSONB NOT NULL,
  "status" "TradeAuctionStatus" NOT NULL DEFAULT 'active',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "trade_auctions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trade_auctions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "trade_auctions_offered_card_id_fkey" FOREIGN KEY ("offered_card_id") REFERENCES "pokemon_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "trade_auctions_creator_id_status_idx" ON "trade_auctions"("creator_id", "status");
CREATE INDEX IF NOT EXISTS "trade_auctions_status_expires_at_idx" ON "trade_auctions"("status", "expires_at");

CREATE TABLE IF NOT EXISTS "trade_offers" (
  "id" TEXT NOT NULL,
  "auction_id" TEXT NOT NULL,
  "proposer_id" TEXT NOT NULL,
  "status" "TradeOfferStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "trade_offers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trade_offers_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "trade_auctions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "trade_offers_proposer_id_fkey" FOREIGN KEY ("proposer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "trade_offers_auction_id_status_idx" ON "trade_offers"("auction_id", "status");
CREATE INDEX IF NOT EXISTS "trade_offers_proposer_id_status_idx" ON "trade_offers"("proposer_id", "status");

CREATE TABLE IF NOT EXISTS "trade_offer_cards" (
  "offer_id" TEXT NOT NULL,
  "card_id" TEXT NOT NULL,
  "finish" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,

  CONSTRAINT "trade_offer_cards_pkey" PRIMARY KEY ("offer_id", "card_id", "finish"),
  CONSTRAINT "trade_offer_cards_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "trade_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "trade_offer_cards_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "pokemon_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "trade_offer_cards_offer_id_idx" ON "trade_offer_cards"("offer_id");
CREATE INDEX IF NOT EXISTS "trade_offer_cards_card_id_finish_idx" ON "trade_offer_cards"("card_id", "finish");

CREATE TABLE IF NOT EXISTS "trade_notifications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "viewed" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "trade_notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trade_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "trade_notifications_user_id_viewed_idx" ON "trade_notifications"("user_id", "viewed");
CREATE INDEX IF NOT EXISTS "trade_notifications_created_at_idx" ON "trade_notifications"("created_at");
