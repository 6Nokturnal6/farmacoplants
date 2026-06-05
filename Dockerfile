# Multi-stage Dockerfile for self-hosting the TanStack Start app on your own server.
# Build artefact: a Node.js server produced by nitro's `node-server` preset.

# ---------- Builder ----------
FROM oven/bun:1.2 AS builder
WORKDIR /app

# Install deps (cached layer)
COPY package.json bun.lock* bunfig.toml* ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .

# Build-time public env vars (must be present at `vite build` to be inlined)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

# Tell vite.config.ts to use nitro's node-server preset
ENV BUILD_PRESET=node-server
RUN bun run build

# ---------- Runtime ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy the nitro output (self-contained: server + bundled deps + public assets)
COPY --from=builder /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
