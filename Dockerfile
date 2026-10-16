# Full-stack NKAI Studio app image for Hugging Face Spaces (Docker SDK)
FROM node:22-bookworm-slim AS build
# Production deployments must show real sign-in controls; never ship the template's dev-user mode.
ENV VITE_AUTH_ENABLED=true NITRO_PRESET=node-server
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build
# The production server and startup migrator need only production dependencies.
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 NITRO_HOST=0.0.0.0 PORT=7860 NITRO_PORT=7860 VITE_AUTH_ENABLED=true
COPY --from=build /app/.output ./.output
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=build /app/scripts/migration-plan.mjs ./scripts/migration-plan.mjs
COPY --from=build /app/migrations ./migrations
EXPOSE 7860
# HF Space secrets are runtime-only. Apply PostgreSQL migrations at container
# startup so auth/app schemas are present before the Nitro server accepts traffic.
CMD ["sh", "-c", "node scripts/migrate.mjs && node .output/server/index.mjs"]
