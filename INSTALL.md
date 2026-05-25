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

For the production frontend, use the GitHub Pages deployment instead of the Vite dev server:

```text
https://mathis-gala.github.io/Booster-Break/
```

## Server Deployment

The fastest production setup is the bundled Caddy deployment. Caddy handles HTTPS automatically,
Postgres runs next to the API, and the API image is pulled from GitHub Container Registry.

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
API_DOMAIN=api.example.com

POSTGRES_DB=booster_break
POSTGRES_USER=booster_break
POSTGRES_PASSWORD=<long-random-password>
DATABASE_URL=postgresql://booster_break:<long-random-password>@postgres:5432/booster_break

API_ORIGIN=https://api.example.com
WEB_ORIGIN=https://mathis-gala.github.io
WEB_APP_URL=https://mathis-gala.github.io/Booster-Break/
SLACK_REDIRECT_URI=https://api.example.com/auth/slack/callback

SLACK_CLIENT_ID=<slack-client-id>
SLACK_CLIENT_SECRET=<slack-client-secret>

SECURE_COOKIES=true
SESSION_COOKIE_NAME=booster_break_session
```

Keep this env file private:

```bash
chmod 600 booster-break.env
```

Start everything:

```bash
docker compose pull
docker compose up -d
```

Caddy will request and renew the HTTPS certificate for `API_DOMAIN`. Make sure DNS points
`API_DOMAIN` to the server and ports `80` and `443` are open.

The CI/CD pipeline builds and pushes images only. Database URLs, Slack secrets, and Postgres
passwords stay in `booster-break.env` or a server secret manager.

To update later:

```bash
cd /opt/booster-break
docker compose pull api
docker compose up -d api
```

## GitHub Pages Frontend

For the GitHub Pages build, set the repository variable `VITE_API_ORIGIN` to the same API origin
without a trailing slash:

```text
https://api.example.com
```

This is a repository variable, not a secret. The frontend bundle is public, so database credentials,
Slack secrets, and private API keys must never be stored in `VITE_*` values.

The hosted frontend falls back to `VITE_LOCAL_API_ORIGIN` when `VITE_API_ORIGIN` cannot be reached.
By default that local fallback is:

```text
http://127.0.0.1:3100
```

If you use the hosted GitHub Pages frontend with a locally running API, your API env still needs:

```env
WEB_ORIGIN=https://mathis-gala.github.io
WEB_APP_URL=https://mathis-gala.github.io/Booster-Break/
```

## Slack OAuth

In the Slack app OAuth settings, add the exact production callback:

```text
https://api.example.com/auth/slack/callback
```

It must match `SLACK_REDIRECT_URI`.

## Domains and Cookies

The cleanest production setup is to use the same registrable domain for frontend and API:

```text
https://booster.example.com
https://api.example.com
```

If the frontend stays on `https://mathis-gala.github.io/Booster-Break/` and the API is on your own
domain, authentication cookies are cross-site and browser cookie rules can be stricter. Prefer a
custom GitHub Pages domain such as `booster.example.com` when deploying for real users.
