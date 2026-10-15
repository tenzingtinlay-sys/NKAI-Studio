# Full-stack NKAI Studio app image for Hugging Face Spaces (Docker SDK)
FROM node:22-bookworm-slim AS build
# Production deployments must show real sign-in controls; never ship the template's dev-user mode.
ENV VITE_AUTH_ENABLED=true
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 NITRO_HOST=0.0.0.0 PORT=7860 NITRO_PORT=7860 VITE_AUTH_ENABLED=true
COPY --from=build /app/.output ./.output
EXPOSE 7860
CMD ["node", ".output/server/index.mjs"]
