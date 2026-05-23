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

Use one folder and one env file per deployed project:

```text
/opt/booster-break/
  docker-compose.yml
  booster-break.env
```

Do not use a global `.env` shared by multiple projects.

The server should pull the GitHub Container Registry image and inject credentials at runtime:

```yaml
services:
  api:
    image: ghcr.io/mathis-gala/booster-break/api:latest
    env_file:
      - booster-break.env
```

The CI/CD pipeline builds and pushes images only. Database URLs, Slack secrets, and Postgres
passwords stay in server-side env files or a secret manager.

Set these production origins in `booster-break.env`:

```env
API_ORIGIN=https://api.example.com
WEB_ORIGIN=https://mathis-gala.github.io/Booster-Break/
SLACK_REDIRECT_URI=https://api.example.com/auth/slack/callback
```

For the GitHub Pages build, set the repository variable `VITE_API_ORIGIN` to the same API origin
without a trailing slash.

The hosted frontend falls back to `VITE_LOCAL_API_ORIGIN` when `VITE_API_ORIGIN` cannot be reached.
By default that local fallback is:

```text
http://127.0.0.1:3100
```

If you use the hosted GitHub Pages frontend with a locally running API, your API env still needs:

```env
WEB_ORIGIN=https://mathis-gala.github.io/Booster-Break/
```
