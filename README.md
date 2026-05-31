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
bun install
bun run dev:web
bun run build:web
bun run lint
bun run typecheck
bun run build
```

The web app runs on `http://localhost:5173` and proxies `/api/*` to the Elysia API on
`http://localhost:3100`.

The public GitHub Pages build is still available, but the recommended WiFi/server
deployment serves the web app and API from the same Raspberry Pi origin:

```text
https://booster.example.com
https://booster.example.com/api
```

## Local Environment

Runtime credentials are not committed. Copy the example file and fill your own values:

```bash
cp apps/api/.env.example apps/api/.env.local
```

For Docker Compose, `DATABASE_URL` must use the Compose service hostname:

```env
DATABASE_URL=postgresql://booster_break:<your-password>@postgres:5432/booster_break
```

For host tools connecting to the Compose database, use `127.0.0.1` instead:

```env
DATABASE_URL=postgresql://booster_break:<your-password>@127.0.0.1:5432/booster_break
```

Keep real values in `apps/api/.env.local` for local development. For a server deployment, keep a
per-project env file next to that server's Compose file, for example:

```text
/opt/booster-break/
  docker-compose.yml
  booster-break.env
```

Do not reuse a global `.env` across projects.

See [INSTALL.md](./INSTALL.md) for the standalone setup guide.

## Docker Development

Run the backend and Postgres with Docker:

```bash
docker compose up -d postgres api
```

Then run the web locally:

```bash
bun run dev:web
```

Health check:

```bash
curl http://127.0.0.1:3100/health
```

The API image contains no secrets. Local credentials come from `apps/api/.env.local`; production
credentials should come from the server env file or a deployment secret manager.

## Production CI/CD

GitHub Actions runs the full quality gate on pull requests and pushes to `main`:

```bash
bun run format:check
bun run lint
bun run typecheck
```

On pushes to `main`, the workflow builds the web app with the GitHub Pages base path and deploys
`apps/web/dist` to GitHub Pages. It also builds and pushes same-origin Docker images for the
Raspberry Pi/server deployment:

```text
ghcr.io/mathis-gala/booster-break/web:latest
ghcr.io/mathis-gala/booster-break/api:latest
```

For the server deployment, leave `VITE_API_ORIGIN` empty in the web image. The frontend calls
same-origin `/api/*`, and Caddy proxies those requests to the API container.

If you still use the GitHub Pages frontend, set repository variable `VITE_API_ORIGIN` to a public
HTTPS API origin. Do not point GitHub Pages at a private WiFi/LAN IP: modern browsers can show a
permission prompt because a public origin is trying to access local-network devices.

Leave `VITE_API_ORIGIN` empty only for local development, where the Vite dev server proxies `/api`
to `http://127.0.0.1:3100`.

For the recommended same-origin server deployment, use:

```text
API_ORIGIN=https://booster.example.com/api
WEB_ORIGIN=https://booster.example.com
WEB_APP_URL=https://booster.example.com
SLACK_REDIRECT_URI=https://booster.example.com/api/auth/slack/callback
```

The GitHub Pages fallback can use:

```text
VITE_API_ORIGIN=https://api.example.com
WEB_ORIGIN=https://mathis-gala.github.io
WEB_APP_URL=https://mathis-gala.github.io/Booster-Break/
```

GitHub Container Registry also publishes commit-pinned images:

```text
ghcr.io/mathis-gala/booster-break/web:sha-<commit>
ghcr.io/mathis-gala/booster-break/api:sha-<commit>
```

## Slack Auth

The API uses Slack OAuth for sign-in. Sessions are stored in HTTP-only cookies through Prisma.

It also supports server-admin generated magic links for custom users:

- `POST /auth/magic/generate` (requires `MAGIC_LINK_ADMIN_SECRET`)
- `GET /auth/magic/callback?token=...`

Magic links are one-time, expire by policy (default: 30 days), and create the same authenticated
session cookie format as Slack sign-in.

Auth endpoints:

- `GET /auth/me`
- `GET /auth/slack/start`
- `GET /auth/slack/callback`
- `POST /auth/logout`
- `POST /auth/magic/generate`
- `GET /auth/magic/callback`

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

The pipeline builds and pushes Docker images only. It must not bake database URLs, Slack secrets,
or Postgres passwords into the image.

The API image runs `prisma migrate deploy` on startup. Production updates should back up Postgres
before pulling a new image:

```bash
docker compose exec postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "backup-$(date +%Y%m%d-%H%M%S).sql"
docker compose pull
docker compose up -d
docker compose logs -f api
```

Downloaded users run the image with their own runtime env file:

```yaml
services:
  web:
    image: ghcr.io/mathis-gala/booster-break/web:latest
  api:
    image: ghcr.io/mathis-gala/booster-break/api:latest
    env_file:
      - booster-break.env
```

The env file is private to that server/project and is never committed.
