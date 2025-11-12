# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init, openssl, and wget for health checks
RUN apk add --no-cache dumb-init openssl wget

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and migrations for database setup
COPY prisma ./prisma

# Copy entrypoint script for running migrations
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Set environment
ENV NODE_ENV=production
ENV PORT=3082

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=5 \
  CMD wget --quiet --tries=1 --spider http://localhost:3082/api/health || exit 1

# Run with dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
