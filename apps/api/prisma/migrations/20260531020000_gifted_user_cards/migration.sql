CREATE TABLE IF NOT EXISTS "gifted_user_cards" (
  "user_id" TEXT NOT NULL,
  "card_id" TEXT NOT NULL,
  "finish" TEXT NOT NULL DEFAULT 'normal',
  "quantity" INTEGER NOT NULL,
  "first_collected_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "gifted_user_cards_pkey" PRIMARY KEY ("user_id", "card_id", "finish"),
  CONSTRAINT "gifted_user_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "gifted_user_cards_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "pokemon_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "gifted_user_cards_user_id_idx" ON "gifted_user_cards"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gifted_user_cards_quantity_positive_check'
  ) THEN
    ALTER TABLE "gifted_user_cards"
      ADD CONSTRAINT "gifted_user_cards_quantity_positive_check" CHECK ("quantity" > 0) NOT VALID;
  END IF;
END
$$;
