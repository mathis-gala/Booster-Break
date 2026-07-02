CREATE TABLE IF NOT EXISTS "booster_rotations" (
  "id" TEXT NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "source_poll_id" TEXT,

  CONSTRAINT "booster_rotations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "booster_rotations_starts_at_ends_at_idx" ON "booster_rotations"("starts_at", "ends_at");
CREATE INDEX IF NOT EXISTS "booster_rotations_source_poll_id_idx" ON "booster_rotations"("source_poll_id");

CREATE TABLE IF NOT EXISTS "booster_rotation_sets" (
  "rotation_id" TEXT NOT NULL,
  "set_id" TEXT NOT NULL,
  "position" INTEGER NOT NULL,

  CONSTRAINT "booster_rotation_sets_pkey" PRIMARY KEY ("rotation_id", "set_id"),
  CONSTRAINT "booster_rotation_sets_rotation_id_fkey" FOREIGN KEY ("rotation_id") REFERENCES "booster_rotations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "booster_rotation_sets_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "pokemon_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "booster_rotation_sets_rotation_id_position_key" ON "booster_rotation_sets"("rotation_id", "position");
CREATE INDEX IF NOT EXISTS "booster_rotation_sets_set_id_idx" ON "booster_rotation_sets"("set_id");

CREATE TABLE IF NOT EXISTS "booster_rotation_polls" (
  "id" TEXT NOT NULL,
  "voting_starts_at" TIMESTAMP(3) NOT NULL,
  "voting_ends_at" TIMESTAMP(3) NOT NULL,
  "target_starts_at" TIMESTAMP(3) NOT NULL,
  "target_ends_at" TIMESTAMP(3) NOT NULL,
  "selected_proposal_id" TEXT,
  "closed_at" TIMESTAMP(3),

  CONSTRAINT "booster_rotation_polls_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "booster_rotation_polls_voting_starts_at_voting_ends_at_idx" ON "booster_rotation_polls"("voting_starts_at", "voting_ends_at");
CREATE INDEX IF NOT EXISTS "booster_rotation_polls_target_starts_at_target_ends_at_idx" ON "booster_rotation_polls"("target_starts_at", "target_ends_at");
CREATE INDEX IF NOT EXISTS "booster_rotation_polls_selected_proposal_id_idx" ON "booster_rotation_polls"("selected_proposal_id");

CREATE TABLE IF NOT EXISTS "booster_rotation_proposals" (
  "id" TEXT NOT NULL,
  "poll_id" TEXT NOT NULL,
  "position" INTEGER NOT NULL,

  CONSTRAINT "booster_rotation_proposals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "booster_rotation_proposals_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "booster_rotation_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "booster_rotation_proposals_poll_id_position_key" ON "booster_rotation_proposals"("poll_id", "position");
CREATE INDEX IF NOT EXISTS "booster_rotation_proposals_poll_id_idx" ON "booster_rotation_proposals"("poll_id");

CREATE TABLE IF NOT EXISTS "booster_rotation_proposal_sets" (
  "proposal_id" TEXT NOT NULL,
  "set_id" TEXT NOT NULL,
  "position" INTEGER NOT NULL,

  CONSTRAINT "booster_rotation_proposal_sets_pkey" PRIMARY KEY ("proposal_id", "set_id"),
  CONSTRAINT "booster_rotation_proposal_sets_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "booster_rotation_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "booster_rotation_proposal_sets_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "pokemon_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "booster_rotation_proposal_sets_proposal_id_position_key" ON "booster_rotation_proposal_sets"("proposal_id", "position");
CREATE INDEX IF NOT EXISTS "booster_rotation_proposal_sets_set_id_idx" ON "booster_rotation_proposal_sets"("set_id");

CREATE TABLE IF NOT EXISTS "booster_rotation_votes" (
  "poll_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "proposal_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "booster_rotation_votes_pkey" PRIMARY KEY ("poll_id", "user_id"),
  CONSTRAINT "booster_rotation_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "booster_rotation_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "booster_rotation_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "booster_rotation_votes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "booster_rotation_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "booster_rotation_votes_proposal_id_idx" ON "booster_rotation_votes"("proposal_id");
CREATE INDEX IF NOT EXISTS "booster_rotation_votes_user_id_idx" ON "booster_rotation_votes"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booster_rotations_source_poll_id_fkey'
  ) THEN
    ALTER TABLE "booster_rotations"
      ADD CONSTRAINT "booster_rotations_source_poll_id_fkey"
      FOREIGN KEY ("source_poll_id") REFERENCES "booster_rotation_polls"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'booster_rotation_polls_selected_proposal_id_fkey'
  ) THEN
    ALTER TABLE "booster_rotation_polls"
      ADD CONSTRAINT "booster_rotation_polls_selected_proposal_id_fkey"
      FOREIGN KEY ("selected_proposal_id") REFERENCES "booster_rotation_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
