# Multi-stage Dockerfile for Google Cloud Run
# Stage 1: Build Frontend and Server Bundle
FROM node:20-alpine AS builder
WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build Vite frontend & Express Node server bundle
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled build artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Expose default Cloud Run port
EXPOSE 8080

# Run the production Express server
CMD ["node", "dist/server.cjs"]
