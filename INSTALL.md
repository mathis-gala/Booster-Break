# Booster Break Installation

This project is designed so Docker images never contain secrets. Every runtime credential is
provided by an env file or a deployment secret manager.

## Local Development

Copy the example env file:

```bash
cp apps/api/.env.example apps/api/.env.local
```

Choose your own values in `apps/api/.env.local`.

For Docker Compose, `DATABASE_URL` must use the internal Compose service name:

```env
DATABASE_URL=postgresql://booster_break:<password>@postgres:5432/booster_break
```

Start the backend and database:

```bash
docker compose up -d postgres api
```

Start the web app:

```bash
bun run dev:web
```

Open:

```text
http://127.0.0.1:5173
```

For a local WiFi/server deployment, use the Docker/Caddy stack below instead of the Vite dev
server.

The GitHub Pages build is useful as a public static preview, but it should not call a private WiFi
API. That browser flow can trigger a permission prompt because a public origin is accessing local
network devices.

```text
https://mathis-gala.github.io/Booster-Break/
```

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

## GitHub Pages Frontend

The GitHub Pages frontend is optional. For a Raspberry Pi on WiFi, prefer the same-origin server
deployment above.

If you use GitHub Pages anyway, set repository variable `VITE_API_ORIGIN` to a public HTTPS API
origin without a trailing slash:

```text
https://api.example.com
```

This is a repository variable, not a secret. The frontend bundle is public, so database credentials,
Slack secrets, and private API keys must never be stored in `VITE_*` values.

In production, leave `VITE_LOCAL_API_ORIGIN` empty. It is only a development fallback. Setting it in
the hosted frontend can trigger browser prompts asking for access to local-network devices.

If you use the hosted GitHub Pages frontend with a locally running API, your API env still needs:

```env
WEB_ORIGIN=https://mathis-gala.github.io
WEB_APP_URL=https://mathis-gala.github.io/Booster-Break/
```

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

If the frontend stays on `https://mathis-gala.github.io/Booster-Break/` and the API is on your own
domain, authentication cookies are cross-site and browser cookie rules can be stricter. If that API
resolves to a private WiFi address, browsers can also ask for local-network access.
