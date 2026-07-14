FROM oven/bun:1.3.13@sha256:87416c977a612a204eb54ab9f3927023c2a3c971f4f345a01da08ea6262ae30e AS deps

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

FROM nginx:1.30.3-alpine@sha256:0d3b80406a13a767339fbe2f41406d6c7da727ab89cf8fae399e81f780f814d1 AS runtime

RUN apk upgrade --no-cache

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /etc/nginx/conf.d /run /var/cache/nginx

EXPOSE 80

USER nginx

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["wget", "--quiet", "--spider", "http://127.0.0.1/"]
