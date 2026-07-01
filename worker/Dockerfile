# syntax=docker/dockerfile:1
# Build context = repo root. The worker imports `@finflow/api/schema`, so the
# api workspace source must be present in the image too.
FROM node:20-alpine

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY api/package.json ./api/
COPY web/package.json ./web/
COPY worker/package.json ./worker/

# `...` pulls in the worker's workspace dependency (@finflow/api).
RUN pnpm install --frozen-lockfile --filter @finflow/worker...

# Both sources: worker runs via tsx and resolves @finflow/api/schema -> api/src.
COPY api ./api
COPY worker ./worker

WORKDIR /app/worker
ENV NODE_ENV=production
EXPOSE 9100

CMD ["pnpm", "exec", "tsx", "src/index.ts"]
