DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "trade_auctions"
    WHERE "status" = 'active'
    GROUP BY "offered_card_id", "offered_card_finish"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot create active auction card uniqueness constraint while duplicate active auctions exist';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "trade_auctions_active_card_unique_idx"
ON "trade_auctions"("offered_card_id", "offered_card_finish")
WHERE "status" = 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_cards_quantity_positive_check'
  ) THEN
    ALTER TABLE "user_cards"
      ADD CONSTRAINT "user_cards_quantity_positive_check" CHECK ("quantity" > 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trade_offer_cards_quantity_positive_check'
  ) THEN
    ALTER TABLE "trade_offer_cards"
      ADD CONSTRAINT "trade_offer_cards_quantity_positive_check" CHECK ("quantity" > 0) NOT VALID;
  END IF;
END
$$;
