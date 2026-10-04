# syntax=docker/dockerfile:1.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e
FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/astronomy-core/package.json ./packages/astronomy-core/package.json
COPY packages/coordinate-system/package.json ./packages/coordinate-system/package.json
COPY packages/miniapp-contracts/package.json ./packages/miniapp-contracts/package.json
COPY workers/miniapp-api/package.json ./workers/miniapp-api/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts \
    --workspace @starward/astronomy-core \
    --workspace @starward/coordinate-system \
    --workspace @starward/miniapp-contracts \
    --workspace @starward/miniapp-api \
    --include-workspace-root=false

COPY packages/astronomy-core ./packages/astronomy-core
COPY packages/coordinate-system ./packages/coordinate-system
COPY packages/miniapp-contracts ./packages/miniapp-contracts
COPY workers/miniapp-api ./workers/miniapp-api
COPY tools/run-node.cjs ./tools/run-node.cjs
COPY tools/deployment/sky-static-bundle.mjs tools/deployment/sky-static-bundle.d.mts ./tools/deployment/
ARG STARWARD_RELEASE_REVISION
# The shared astronomy package also serves other products. Its Gaia DR3 pack
# is not licensed for this Mini Program's commercial sky delivery, so keep it
# out of the Mini API runtime image after compilation.
RUN npm run build:miniapp:release \
    && test -f packages/astronomy-core/dist/data/gaia-dr3-bright-stars.v1.json \
    && test -f packages/astronomy-core/dist/data/gaia-dr3-bright-stars.v1.manifest.json \
    && rm -- packages/astronomy-core/dist/data/gaia-dr3-bright-stars.v1.json \
             packages/astronomy-core/dist/data/gaia-dr3-bright-stars.v1.manifest.json \
    && node --conditions=production workers/miniapp-api/dist/sky-public-asset-export.js \
         --output /app/sky-public --revision "${STARWARD_RELEASE_REVISION}"

FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS production-dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/astronomy-core/package.json ./packages/astronomy-core/package.json
COPY packages/coordinate-system/package.json ./packages/coordinate-system/package.json
COPY packages/miniapp-contracts/package.json ./packages/miniapp-contracts/package.json
COPY workers/miniapp-api/package.json ./workers/miniapp-api/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts \
    --workspace @starward/astronomy-core \
    --workspace @starward/coordinate-system \
    --workspace @starward/miniapp-contracts \
    --workspace @starward/miniapp-api \
    --include-workspace-root=false

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
# npm installs jsdom 30 under the Mini API workspace because the root lockfile
# also contains a different jsdom version. Keep workspace-local production deps.
COPY --from=production-dependencies --chown=node:node /app/workers/miniapp-api/node_modules ./workers/miniapp-api/node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/packages/astronomy-core/package.json ./packages/astronomy-core/package.json
COPY --from=build --chown=node:node /app/packages/astronomy-core/dist ./packages/astronomy-core/dist
COPY --from=build --chown=node:node /app/packages/coordinate-system/package.json ./packages/coordinate-system/package.json
COPY --from=build --chown=node:node /app/packages/coordinate-system/dist ./packages/coordinate-system/dist
COPY --from=build --chown=node:node /app/packages/miniapp-contracts/package.json ./packages/miniapp-contracts/package.json
COPY --from=build --chown=node:node /app/packages/miniapp-contracts/dist ./packages/miniapp-contracts/dist
COPY --from=build --chown=node:node /app/workers/miniapp-api/package.json ./workers/miniapp-api/package.json
COPY --from=build --chown=node:node /app/workers/miniapp-api/dist ./workers/miniapp-api/dist
COPY --from=build --chown=node:node /app/workers/miniapp-api/assets ./workers/miniapp-api/assets
COPY --from=build --chown=node:node /app/sky-public/publication ./sky-public/publication
COPY --from=build --chown=node:node /app/tools/deployment/sky-static-bundle.mjs ./tools/deployment/sky-static-bundle.mjs
COPY --chown=node:node database/miniapp/migrations ./database/miniapp/migrations
RUN test -f sky-public/publication/image-artifact.json \
    && test -f sky-public/publication/index.json \
    && test -f sky-public/publication/delivery.caddy \
    && test ! -e packages/astronomy-core/dist/data/gaia-dr3-bright-stars.v1.json \
    && test -f workers/miniapp-api/assets/moon/coverage-manifest.json \
    && test -f workers/miniapp-api/assets/moon/clementine-uv750-v21-coverage-2048x1024.png \
    && test ! -e packages/astronomy-core/dist/data/gaia-dr3-bright-stars.v1.manifest.json \
    && test -f packages/astronomy-core/dist/data/bsc5p-bright-stars.v2.json \
    && test -f packages/astronomy-core/dist/data/bsc5p-bright-stars.v3.json \
    && test -f workers/miniapp-api/assets/sao-v2/publication.json \
    && test -f workers/miniapp-api/assets/sao-v2/catalog.json \
    && test -f workers/miniapp-api/assets/celestial-names-v2/publication.json \
    && test -f workers/miniapp-api/assets/celestial-names-v3/publication.json \
    && test -f workers/miniapp-api/assets/celestial-names-v3/chinese-bright-star-aliases.v3.json \
    && test -f workers/miniapp-api/assets/celestial-names-v3/source-provenance.json \
    && test -f workers/miniapp-api/assets/jupiter/manifest.json \
    && test -f workers/miniapp-api/assets/saturn/manifest.json \
    && test -f workers/miniapp-api/assets/saturn/saturn-opal-2025a-median-bands-8x512.png \
    && test -f workers/miniapp-api/assets/uranus/manifest.json \
    && test -f workers/miniapp-api/assets/uranus/uranus-opal-2025a-median-bands-8x512.png \
    && test -f workers/miniapp-api/assets/neptune/manifest.json \
    && test -f workers/miniapp-api/assets/neptune/neptune-opal-2025b-median-bands-8x512.png \
    && test -f workers/miniapp-api/assets/jupiter/jupiter-opal-2024c-median-bands-8x512.png \
    && test -f workers/miniapp-api/assets/deep-sky/sdss-m51/manifest.json \
    && test -f workers/miniapp-api/assets/deep-sky/sdss-m51/M-51-overview.jpg \
    && test -f workers/miniapp-api/assets/deep-sky/sdss-m51/M-51-medium.jpg \
    && test -f workers/miniapp-api/assets/deep-sky/sdss-m51/M-51-detail.jpg \
    && test -f workers/miniapp-api/node_modules/jsdom/package.json

USER node
CMD ["node", "--conditions=production", "workers/miniapp-api/dist/main.js"]
