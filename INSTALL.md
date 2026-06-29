# Booster Break Installation

This project is designed so Docker images never contain secrets. Every runtime credential is
provided by an env file or a deployment secret manager.

## Local Development

Run the setup script after cloning:

```bash
bun setup
```

The setup script installs dependencies, creates missing local env files, starts the dev Postgres
container, generates Prisma Client, applies existing migrations, and typechecks the workspace.
Existing local env files are left unchanged.

For the default host-run API, `DATABASE_URL` must use the Postgres port exposed by
`docker-compose.dev.yml`:

```env
DATABASE_URL=postgresql://booster_break:<password>@127.0.0.1:5232/booster_break
```

If `bun setup` reports an existing local schema without Prisma migration history and the local
database data is disposable, reset it explicitly:

```bash
bun setup --reset-db
```

Use the internal Compose service name only when the API itself runs inside Docker Compose:

```env
DATABASE_URL=postgresql://booster_break:<password>@postgres:5432/booster_break
```

Start the API and web dev servers:

```bash
bun run dev:api
bun run dev:web
```

Open:

```text
http://127.0.0.1:5173
```

Health check:

```text
http://127.0.0.1:3100/health
```

For a local WiFi/server deployment, use the Docker/Caddy stack below instead of the Vite dev
server.

## Server Deployment

The fastest production setup is the bundled Caddy deployment. Caddy serves the frontend at `/`,
proxies `/api/*` to the API container, and Postgres runs next to the API. This deploy file expects
certificate files mounted from `./certs`. Keeping the browser on one origin avoids CORS,
cross-site cookies, and local-network permission prompts.

On the server:

```bash
mkdir -p /opt/booster-break
cd /opt/booster-break
```

Copy these files from the repository to `/opt/booster-break`:

```text
deploy/docker-compose.server.yml -> docker-compose.yml
deploy/Caddyfile -> Caddyfile
deploy/booster-break.env.example -> booster-break.env
```

Fill `booster-break.env`:

```env
API_DOMAIN=booster.example.com

POSTGRES_DB=booster_break
POSTGRES_USER=booster_break
POSTGRES_PASSWORD=<long-random-password>
DATABASE_URL=postgresql://booster_break:<long-random-password>@postgres:5432/booster_break

API_ORIGIN=https://booster.example.com/api
WEB_ORIGIN=https://booster.example.com
WEB_APP_URL=https://booster.example.com
SLACK_REDIRECT_URI=https://booster.example.com/api/auth/slack/callback

SLACK_CLIENT_ID=<slack-client-id>
SLACK_CLIENT_SECRET=<slack-client-secret>
MAGIC_LINK_ADMIN_SECRET=<shared-admin-secret>
MAGIC_LINK_TTL_DAYS=30

SECURE_COOKIES=true
SESSION_COOKIE_NAME=booster_break_session
```

Keep this env file private:

```bash
chmod 600 booster-break.env
```

Put the certificate files here:

```text
/opt/booster-break/certs/fullchain.pem
/opt/booster-break/certs/privkey.pem
```

Start everything:

```bash
docker compose pull
docker compose up -d
```

The API container runs `prisma migrate deploy` before starting the server. Migrations are applied
to the existing Postgres volume and do not reset the database.

Caddy will serve `API_DOMAIN` over HTTPS with those mounted certificate files. Make sure DNS points
`API_DOMAIN` to the server and ports `80` and `443` are open on that machine/network path.

The CI/CD pipeline builds and pushes images only. Database URLs, Slack secrets, and Postgres
passwords stay in `booster-break.env` or a server secret manager.

To update later:

```bash
cd /opt/booster-break
docker compose exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "backup-$(date +%Y%m%d-%H%M%S).sql"
docker compose pull
docker compose up -d
docker compose logs -f api
```

The API log should show Prisma migrations finishing before `API listening ...`.

Postgres is not exposed by the default server compose file. To inspect production with Beekeeper
Studio, start the temporary loopback-only override and use an SSH tunnel instead of exposing the
database publicly:

```bash
docker compose -f docker-compose.server.yml -f docker-compose.db-access.yml up -d postgres
```

```bash
ssh -L 5432:127.0.0.1:5432 user@booster.example.com
```

Then connect Beekeeper to `127.0.0.1:5432` with the credentials from `booster-break.env`.

## Slack OAuth

In the Slack app OAuth settings, add the exact production callback:

```text
https://booster.example.com/api/auth/slack/callback
```

It must match `SLACK_REDIRECT_URI`.

## Domains and Cookies

The cleanest production setup is to use one origin for frontend and API:

```text
https://booster.example.com
https://booster.example.com/api
```

Keep the frontend and API on the same domain when possible. Splitting them across different domains
requires stricter CORS and cookie settings.
