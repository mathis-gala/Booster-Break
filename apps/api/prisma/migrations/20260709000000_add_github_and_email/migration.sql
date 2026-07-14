-- AlterTable: add nullable GitHub identity and verified email linking columns.
ALTER TABLE "users" ADD COLUMN "email" TEXT;
ALTER TABLE "users" ADD COLUMN "github_user_id" TEXT;

-- CreateIndex: unique constraints used for lookup/links.
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_github_user_id_key" ON "users"("github_user_id");
