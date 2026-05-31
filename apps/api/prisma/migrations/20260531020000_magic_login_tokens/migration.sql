CREATE TABLE IF NOT EXISTS "magic_login_tokens" (
  "id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" TEXT,

  CONSTRAINT "magic_login_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "magic_login_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "magic_login_tokens_token_hash_key" UNIQUE ("token_hash")
);

CREATE INDEX IF NOT EXISTS "magic_login_tokens_user_id_idx" ON "magic_login_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "magic_login_tokens_expires_at_idx" ON "magic_login_tokens"("expires_at");
