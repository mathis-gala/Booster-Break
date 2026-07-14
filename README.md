# Booster Break

Full-stack TypeScript workspace for a trading card collection app.

## License and Disclaimer

This project is released under the [MIT License](./LICENSE).

This project is an unofficial fan-made tool and is not affiliated with, endorsed,
sponsored, or approved by The Pokemon Company, Nintendo, Game Freak, Creatures,
TCGdex, or Scrydex. Pokemon and Pokemon TCG names, card data, artwork, logos, and
related assets are trademarks and copyrights of their respective owners.

The application does not publish Pokemon card or booster artwork in this repository.
Pokemon TCG metadata and remote image URLs are resolved at runtime through third-party
APIs such as TCGdex and Scrydex. Users are responsible for complying with the terms
of those APIs and any applicable intellectual property rules.

## Stack

- Runtime and package manager: Bun
- Frontend: React, Vite, TanStack Router, TanStack Query, shadcn/ui, Tailwind CSS
- Backend: Elysia
- Shared contracts: TypeScript package in `packages/shared`

## Scripts

```bash
bun setup
bun run dev:api
bun run dev:web
bun run build:web
bun run lint
bun run typecheck
bun run build
```

The web app runs on `http://localhost:5173` and proxies `/api/*` to the Elysia API on
`http://localhost:3100`.

The recommended WiFi/server deployment serves the web app and API from the same
Raspberry Pi origin:

```text
https://booster.example.com
https://booster.example.com/api
```

## Local Environment

Runtime credentials are not committed. Run the setup script after cloning:

```bash
bun setup
```

The setup script:

- installs dependencies from `bun.lock`
- creates `apps/api/.env.local` and `apps/web/.env.local` when they are missing
- starts the local Postgres service from `docker-compose.dev.yml`
- generates Prisma Client and applies existing migrations
- runs the workspace typecheck

Existing local env files are left unchanged. If you already have `apps/api/.env.local`, make sure
host-side tools and `bun run dev:api` use the dev database exposed by `docker-compose.dev.yml`:

```env
DATABASE_URL=postgresql://booster_break:<your-password>@127.0.0.1:5232/booster_break
```

If `bun setup` reports an existing local schema without Prisma migration history and the local
database data is disposable, reset the dev database explicitly:

```bash
bun setup --reset-db
```

Use the Compose service hostname only when the API itself runs inside Docker Compose:

```env
DATABASE_URL=postgresql://booster_break:<your-password>@postgres:5432/booster_break
```

For a server deployment, keep a per-project env file next to that server's Compose file, for
example:

```text
/opt/booster-break/
  docker-compose.yml
  booster-break.env
```

Do not reuse a global `.env` across projects.

See [INSTALL.md](./INSTALL.md) for the standalone setup guide.

## Docker Development

The default development flow runs Postgres in Docker and the API/web dev servers on the host:

```bash
bun setup
bun run dev:api
bun run dev:web
```

Open:

```text
http://127.0.0.1:5173
```

Health check:

```bash
curl http://127.0.0.1:3100/health
```

To run both Postgres and the API in Docker instead, use `docker-compose.yml` and set
`DATABASE_URL` to the Compose service hostname `postgres:5432`.

The API image contains no secrets. Local credentials come from `apps/api/.env.local`; production
credentials should come from the server env file or a deployment secret manager.

## Production CI/CD

GitHub Actions runs the full quality gate on pull requests and pushes to `main`:

```bash
bun run format:check
bun run lint
bun run typecheck
```

On pushes to `main`, the workflow builds and pushes same-origin Docker images for the
Raspberry Pi/server deployment:

```text
ghcr.io/mathis-gala/booster-break/web:latest
ghcr.io/mathis-gala/booster-break/api:latest
```

For the server deployment, leave `VITE_API_ORIGIN` empty in the web image. The frontend calls
same-origin `/api/*`, and Caddy proxies those requests to the API container.

Leave `VITE_API_ORIGIN` empty only for local development, where the Vite dev server proxies `/api`
to `http://127.0.0.1:3100`.

For the recommended same-origin server deployment, use:

```text
API_ORIGIN=https://booster.example.com/api
WEB_ORIGIN=https://booster.example.com
WEB_APP_URL=https://booster.example.com
SLACK_REDIRECT_URI=https://booster.example.com/api/auth/slack/callback
```

GitHub Container Registry also publishes commit-pinned images:

```text
ghcr.io/mathis-gala/booster-break/web:sha-<commit>
ghcr.io/mathis-gala/booster-break/api:sha-<commit>
```

## Auth

The API uses Slack OAuth as the default sign-in method. Sessions are stored in HTTP-only cookies through Prisma.

GitHub sign-in is also available as an alternative provider. The web UI shows Slack as the primary
button, with a dropdown to switch to GitHub. Enable it by setting `GITHUB_CLIENT_ID` and
`GITHUB_CLIENT_SECRET`; the callback URL is `GITHUB_REDIRECT_URI` (defaults to
`<API_ORIGIN>/auth/github/callback`).

Account linking: when a GitHub account signs in for the first time, it is linked to an existing
player if that player already has the same **verified primary email**. The GitHub client fetches the
verified email via `/user/emails`. Linking by display name or pseudo is intentionally not supported,
because those are user-claimable and would allow account takeover.

It also supports server-admin generated magic links for custom users:

- `POST /auth/magic/generate` (requires `MAGIC_LINK_ADMIN_SECRET`)
- `GET /auth/magic/callback?token=...`

Magic links are one-time, expire by policy (default: 30 days), and create the same authenticated
session cookie format as Slack sign-in.

For local development, the Vite UI shows a pseudo-only sign-in form. It calls
`POST /auth/dev/login`, which creates or reuses a custom user and sets the same session cookie.
This route is enabled automatically only for loopback HTTP API/web origins. Set
`DEV_AUTH_ENABLED=false` to disable it.

Auth endpoints:

- `GET /auth/me`
- `GET /auth/slack/start`
- `GET /auth/slack/callback`
- `GET /auth/github/start`
- `GET /auth/github/callback`
- `POST /auth/logout`
- `POST /auth/magic/generate`
- `GET /auth/magic/callback`
- `POST /auth/dev/login` (local development only)

Enable magic links by setting `MAGIC_LINK_ADMIN_SECRET` in the API environment.

Example admin call to create a one-time link for a custom account:

```bash
curl -X POST "$API_ORIGIN/auth/magic/generate" \
  -H "x-magic-admin-secret: $MAGIC_LINK_ADMIN_SECRET" \
  -H "content-type: application/json" \
  -d '{"pseudo":"guest-01","displayName":"Guest One","avatarUrl":"https://example.com/avatar.png","expiresInDays":30}'
```

The response includes a `token` and `link` to share with the user.

## Pokemon TCG Data

The API uses Prisma with Postgres for persistence and automatically syncs Pokemon booster sets
released from 2024 onward from TCGdex when the local catalog is empty. Card images are stored as
remote asset URLs, and multilingual catalog support is available through the TCGdex SDK language
setting. Real booster-pack artwork is resolved separately through Scrydex sealed product images
when available; sets without booster artwork are hidden from the pack opener.

Optional Scrydex credentials can improve sealed product matching:

```bash
SCRYDEX_API_KEY=...
SCRYDEX_TEAM_ID=...
```

Pokemon endpoints:

- `GET /pokemon/sets`
- `GET /pokemon/cards?setId=<set-id>`
- `POST /pokemon/packs/open`

## GitHub Container Registry

Publishing a GitHub release builds and pushes versioned API and web images. A stable release also
updates the `latest` tag; a pre-release only publishes its release and commit tags. The pipeline
does not connect to or deploy the production server. It must not bake database URLs, Slack secrets,
or Postgres passwords into the image.

The API image runs `prisma migrate deploy` on startup. Production updates should back up Postgres
before pulling a new image. Set `IMAGE_TAG` in the `.env` file next to the production Compose file
to the GitHub release tag, for example `IMAGE_TAG=v1.0.0`, then deploy manually:

```bash
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "backup-$(date +%Y%m%d-%H%M%S).sql"
docker compose pull web api
docker compose up -d --force-recreate web api
docker compose logs --tail=100 api
```

Rollback by restoring the previous `IMAGE_TAG` in `.env` and running the same pull and up commands.

Downloaded users run the image with their own runtime env file:

```yaml
services:
  web:
    image: ghcr.io/mathis-gala/booster-break/web:${IMAGE_TAG:-latest}
  api:
    image: ghcr.io/mathis-gala/booster-break/api:${IMAGE_TAG:-latest}
    env_file:
      - booster-break.env
```

The env file is private to that server/project and is never committed.
