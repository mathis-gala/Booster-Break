FROM oven/bun:1.3.13-alpine@sha256:4de475389889577f346c636f956b42a5c31501b654664e9ae5726f94d7bb5349 AS deps

WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN bun install --frozen-lockfile

FROM oven/bun:1.3.13-alpine@sha256:4de475389889577f346c636f956b42a5c31501b654664e9ae5726f94d7bb5349 AS production-deps

WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts

RUN bun install --frozen-lockfile --production --filter @tcg-collection/api
RUN bun --cwd apps/api prisma:generate

FROM deps AS build

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN bun --cwd apps/api build

FROM oven/bun:1.3.13-alpine@sha256:4de475389889577f346c636f956b42a5c31501b654664e9ae5726f94d7bb5349 AS runtime

WORKDIR /app

RUN apk upgrade --no-cache

ENV NODE_ENV=production
ENV PORT=3100
ENV HOST=0.0.0.0
ENV API_ORIGIN=http://127.0.0.1:3100
ENV WEB_ORIGIN=http://127.0.0.1:5173

COPY --chown=bun:bun --from=production-deps /app/node_modules node_modules
COPY --chown=bun:bun --from=build /app/apps/api/dist apps/api/dist
COPY --chown=bun:bun --from=build /app/apps/api/src apps/api/src
COPY --chown=bun:bun --from=build /app/apps/api/prisma apps/api/prisma
COPY --chown=bun:bun --from=build /app/apps/api/prisma.config.ts apps/api/prisma.config.ts
COPY --chown=bun:bun --from=build /app/apps/api/package.json apps/api/package.json
COPY --chown=bun:bun --from=build /app/packages/shared packages/shared

EXPOSE 3100

USER bun

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD ["bun", "-e", "fetch('http://127.0.0.1:3100/health').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"]

CMD ["sh", "-c", "export NODE_PATH=/app/node_modules/.bun/node_modules && cd apps/api && bun /app/node_modules/.bun/node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma && bun dist/index.js"]
