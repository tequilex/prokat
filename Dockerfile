# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# next.config.ts bakes this host into images.remotePatterns at build time.
ARG STORAGE_PUBLIC_BASE
ENV STORAGE_PUBLIC_BASE=$STORAGE_PUBLIC_BASE
RUN pnpm build
RUN pnpm exec esbuild scripts/migrate.ts \
    --bundle --platform=node --target=node22 \
    --format=cjs --outfile=migrate.cjs \
    --external:pg-native

# Процесс доставки в реальном времени. Стадия наследуется от deps, а НЕ от
# builder: копирование --from=builder заставило бы BuildKit прогнать всю стадию
# builder вместе с `next build`, а `docker compose build` собирает сервисы
# параллельно — на 1 ГБ, где next build уже требует swap, это верный OOM.
#
# bufferutil и utf-8-validate — peerDependencies ws, которых в node_modules нет;
# без --external сборка падает на «Could not resolve».
FROM deps AS realtime-build
WORKDIR /app
COPY src ./src
COPY realtime ./realtime
COPY tsconfig.json ./
RUN pnpm exec esbuild realtime/server.ts \
    --bundle --platform=node --target=node22 \
    --format=cjs --outfile=realtime.cjs \
    --external:pg-native --external:bufferutil --external:utf-8-validate

# Рантайм — чистый образ без дев-дерева и без root, как и у app.
FROM node:22-alpine AS realtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app
COPY --from=realtime-build --chown=app:app /app/realtime.cjs ./realtime.cjs
USER app
EXPOSE 3100
# Потолок кучи — тот же, под которым мерился бюджет памяти.
CMD ["node", "--max-old-space-size=96", "realtime.cjs"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Next standalone binds to $HOSTNAME; Docker sets it to the container ID,
# which breaks the localhost healthcheck. Bind to all interfaces instead.
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/drizzle ./drizzle
COPY --from=builder --chown=app:app /app/migrate.cjs ./migrate.cjs
COPY --chown=app:app scripts/entrypoint.sh ./entrypoint.sh
USER app
EXPOSE 3000
CMD ["sh", "./entrypoint.sh"]
