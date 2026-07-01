# syntax=docker/dockerfile:1
# Build context = repo root (pnpm workspace).

# --- Stage 1: build the static bundle ---
FROM node:20-alpine AS build

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY api/package.json ./api/
COPY web/package.json ./web/
COPY worker/package.json ./worker/

RUN pnpm install --frozen-lockfile --filter @finflow/web...

COPY web ./web
RUN pnpm --filter @finflow/web build

# --- Stage 2: serve with nginx (also reverse-proxies /api -> api service) ---
FROM nginx:alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html
EXPOSE 80
