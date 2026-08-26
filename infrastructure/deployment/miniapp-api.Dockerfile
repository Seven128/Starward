# syntax=docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e
FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS build

WORKDIR /app

COPY . .
RUN npm ci --ignore-scripts \
    --workspace @starward/coordinate-system \
    --workspace @starward/miniapp-contracts \
    --workspace @starward/miniapp-api \
    --include-workspace-root=false \
    && npm run build:miniapp:release

FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS production-dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/coordinate-system/package.json ./packages/coordinate-system/package.json
COPY packages/miniapp-contracts/package.json ./packages/miniapp-contracts/package.json
COPY workers/miniapp-api/package.json ./workers/miniapp-api/package.json
RUN npm ci --omit=dev --ignore-scripts \
    --workspace @starward/coordinate-system \
    --workspace @starward/miniapp-contracts \
    --workspace @starward/miniapp-api \
    --include-workspace-root=false \
    && npm cache clean --force

FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS runtime

ARG STARWARD_RELEASE_REVISION=unknown
LABEL org.opencontainers.image.title="Starward Mini Program API" \
      org.opencontainers.image.description="Starward API, migration and outbox worker release image" \
      org.opencontainers.image.source="https://github.com/Seven128/Starward" \
      org.opencontainers.image.revision="${STARWARD_RELEASE_REVISION}"

ENV NODE_ENV=production \
    NODE_OPTIONS=--conditions=production \
    MINIAPP_API_HOST=0.0.0.0 \
    MINIAPP_API_PORT=8787

WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/packages/coordinate-system/package.json ./packages/coordinate-system/package.json
COPY --from=build --chown=node:node /app/packages/coordinate-system/dist ./packages/coordinate-system/dist
COPY --from=build --chown=node:node /app/packages/miniapp-contracts/package.json ./packages/miniapp-contracts/package.json
COPY --from=build --chown=node:node /app/packages/miniapp-contracts/dist ./packages/miniapp-contracts/dist
COPY --from=build --chown=node:node /app/workers/miniapp-api/package.json ./workers/miniapp-api/package.json
COPY --from=build --chown=node:node /app/workers/miniapp-api/dist ./workers/miniapp-api/dist
COPY --from=build --chown=node:node /app/database/miniapp/migrations ./database/miniapp/migrations

USER node
CMD ["node", "--conditions=production", "workers/miniapp-api/dist/main.js"]
