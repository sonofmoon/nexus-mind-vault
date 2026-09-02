# ============================================================================
# 🔒 Stage 1: Build & Compilation Stage
# ============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Install all dependencies including build tools
RUN npm ci

# Copy entire source code
COPY . .

# Build client bundle & compile server.ts to dist/server.cjs
RUN npm run build

# ============================================================================
# 🔒 Stage 2: Minimal Zero-Trust Production Runtime
# ============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install curl for container health check
RUN apk --no-cache add curl

# Copy production bundle and manifests
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/docs ./src/docs

# Install production-only dependencies
RUN npm ci --omit=dev

# Enforce non-root security container user
USER node

EXPOSE 8080

# ⏱️ Container Health Check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start sovereign server
CMD ["node", "dist/server.cjs"]
