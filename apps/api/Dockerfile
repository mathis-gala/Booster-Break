FROM oven/bun:1.3.13 AS deps

WORKDIR /app

COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN bun install --frozen-lockfile

FROM deps AS build

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN bun --cwd apps/api build

FROM oven/bun:1.3.13 AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3100
ENV HOST=0.0.0.0
ENV API_ORIGIN=http://127.0.0.1:3100
ENV WEB_ORIGIN=https://mathis-gala.github.io/Booster-Break/

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/prisma.config.ts apps/api/prisma.config.ts
COPY --from=build /app/apps/api/package.json apps/api/package.json

EXPOSE 3100

CMD ["sh", "-c", "export NODE_PATH=/app/node_modules/.bun/node_modules && cd apps/api && bun /app/node_modules/.bun/node_modules/prisma/build/index.js db push --schema prisma/schema.prisma && bun dist/index.js"]
