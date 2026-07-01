# syntax=docker/dockerfile:1
# Build context = repo root (needed for the pnpm workspace).
FROM node:20-alpine

RUN corepack enable
WORKDIR /app

# Manifests first so `pnpm install` is cached until a package.json changes.
# All workspace manifests are required because pnpm-workspace.yaml lists them.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY api/package.json ./api/
COPY web/package.json ./web/
COPY worker/package.json ./worker/

RUN pnpm install --frozen-lockfile --filter @finflow/api...

# App source
COPY api ./api

WORKDIR /app/api
ENV NODE_ENV=production
EXPOSE 4000

# Run with tsx (no compile step): the API is ESM-with-.js-extensions and this
# keeps the runtime identical to dev. Migrations are applied by the `migrate`
# service before this container starts.
CMD ["pnpm", "exec", "tsx", "src/server.ts"]
