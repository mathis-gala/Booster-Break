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
COPY apps/web apps/web

ENV VITE_BASE_PATH=/
ENV VITE_API_ORIGIN=
ENV VITE_LOCAL_API_ORIGIN=

RUN bun --cwd apps/api prisma:generate
RUN bun --cwd apps/web build

FROM nginx:1.29-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
