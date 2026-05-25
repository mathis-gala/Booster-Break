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

The production web app is deployed to GitHub Pages:

```text
https://mathis-gala.github.io/Booster-Break/
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

See [INSTALL.md](./INSTALL.md) for the standalone setup guide that will be completed with CI/CD
deployment details later.

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
`apps/web/dist` to GitHub Pages. Set the repository variable `VITE_API_ORIGIN` to the deployed API
origin, for example:

```text
https://api.example.com
```

The hosted frontend first tries `VITE_API_ORIGIN`. If that API cannot be reached at the
network/CORS layer, the browser falls back to `VITE_LOCAL_API_ORIGIN`, which defaults to:

```text
http://127.0.0.1:3100
```

Leave `VITE_API_ORIGIN` empty only for local development, where the Vite dev server proxies `/api`
to `http://127.0.0.1:3100`. When using the GitHub Pages frontend with a local backend, the backend
must allow the Pages origin with:

```text
WEB_ORIGIN=https://mathis-gala.github.io
WEB_APP_URL=https://mathis-gala.github.io/Booster-Break/
```

The same workflow builds and pushes the backend image to GitHub Container Registry:

```text
ghcr.io/mathis-gala/booster-break/api:latest
ghcr.io/mathis-gala/booster-break/api:sha-<commit>
```

Deploy the API container with runtime environment values, not baked image secrets. In production,
`WEB_ORIGIN` and `WEB_APP_URL` should be:

```text
WEB_ORIGIN=https://mathis-gala.github.io
WEB_APP_URL=https://mathis-gala.github.io/Booster-Break/
```

## Slack Auth

The API uses Slack OAuth for sign-in. Sessions are stored in HTTP-only cookies through Prisma.

Auth endpoints:

- `GET /auth/me`
- `GET /auth/slack/start`
- `GET /auth/slack/callback`
- `POST /auth/logout`

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

Downloaded users run the image with their own runtime env file:

```yaml
services:
  api:
    image: ghcr.io/mathis-gala/booster-break/api:latest
    env_file:
      - booster-break.env
```

The env file is private to that server/project and is never committed.
