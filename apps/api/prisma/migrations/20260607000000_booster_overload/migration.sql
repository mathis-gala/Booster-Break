-- Booster cooldown overload: a single per-user anchor timestamp drives the capped
-- charge model (one booster regenerates every cooldown, surplus banks up to a cap).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "booster_cooldown_anchor" TIMESTAMP(3);

-- Preserve each existing user's cooldown by anchoring on their last pack opening: the old
-- model's "next open at last_opened + cooldown" is exactly availableBoosters >= 1 in the new
-- model when anchor = last opened_at. Users who never opened keep a NULL anchor (open ready).
UPDATE "users" u
SET "booster_cooldown_anchor" = latest."opened_at"
FROM (
  SELECT "user_id", MAX("opened_at") AS "opened_at"
  FROM "pack_openings"
  GROUP BY "user_id"
) latest
WHERE u."id" = latest."user_id"
  AND u."booster_cooldown_anchor" IS NULL;
