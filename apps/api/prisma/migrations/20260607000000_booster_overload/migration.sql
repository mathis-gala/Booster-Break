ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "booster_cooldown_anchor" TIMESTAMP(3);

UPDATE "users" u
SET "booster_cooldown_anchor" = latest."opened_at"
FROM (
  SELECT "user_id", MAX("opened_at") AS "opened_at"
  FROM "pack_openings"
  GROUP BY "user_id"
) latest
WHERE u."id" = latest."user_id"
  AND u."booster_cooldown_anchor" IS NULL;
