# Use the official Node.js 18 Alpine image as base
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk update && apk add --no-cache libc6-compat python3 make g++ bash curl jq
WORKDIR /app

# Build arguments for deterministic builds
ARG REQUIRE_LOCKFILE=false
ARG NODE_ENV=production
ENV REQUIRE_LOCKFILE=${REQUIRE_LOCKFILE}
ENV NODE_ENV=${NODE_ENV}

# Copy package files
COPY package.json ./
COPY package-lock.json* ./

# Enhanced dependency installation with better error handling and validation
RUN set -ex && \
    echo "=== Starting Enhanced Dependency Installation ===" && \
    echo "Node version: $(node --version)" && \
    echo "NPM version: $(npm --version)" && \
    \
    # Configure npm for better reliability
    npm config set audit-level moderate && \
    npm config set fund false && \
    npm config set update-notifier false && \
    npm config set progress false && \
    \
    # Check if package-lock.json exists and validate it
    if [ -f "package-lock.json" ]; then \
        echo "✓ package-lock.json found, using npm ci"; \
        npm ci --no-audit --no-fund; \
    else \
        echo "⚠ package-lock.json not found"; \
        if [ "$REQUIRE_LOCKFILE" = "true" ] || [ "$NODE_ENV" = "production" ]; then \
            echo "❌ ERROR: package-lock.json is required for deterministic builds"; \
            echo "❌ In production or when REQUIRE_LOCKFILE=true, package-lock.json must be present"; \
            echo "❌ Run './scripts/dependency-sync.sh' to generate package-lock.json"; \
            exit 1; \
        else \
            echo "⚠ Allowing npm install for development build"; \
            npm install --no-audit --no-fund; \
        fi; \
    fi && \
    \
    # Validate critical dependencies are installed
    echo "=== Validating Critical Dependencies ===" && \
    CRITICAL_DEPS="ioredis sharp socket.io socket.io-client prisma @prisma/client next react react-dom" && \
    for dep in $CRITICAL_DEPS; do \
        if [ -d "node_modules/$dep" ]; then \
            echo "✓ $dep installed successfully"; \
        else \
            echo "✗ Critical dependency $dep is missing!"; \
            exit 1; \
        fi; \
    done && \
    \
    # Clean npm cache to reduce image size
    npm cache clean --force && \
    \
    # Display installation summary
    echo "=== Installation Summary ===" && \
    echo "Total packages installed: $(find node_modules -maxdepth 1 -type d | wc -l || echo 'unknown')" && \
    echo "Node modules size: $(du -sh node_modules 2>/dev/null | cut -f1 || echo 'unknown')" && \
    echo "=== Enhanced Dependency Installation Complete ==="

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1

# Add build timestamp for cache busting
ARG BUILD_TIME
ENV BUILD_TIME=${BUILD_TIME}

# Build the application with improved error handling
RUN set -ex && \
    echo "=== Starting Next.js Build Process ===" && \
    echo "Node version: $(node --version)" && \
    echo "NPM version: $(npm --version)" && \
    \
    # Run the build with proper error handling
    npm run build && \
    \
    # Verify the build output
    echo "=== Verifying Build Output ===" && \
    if [ -d ".next" ]; then \
        echo "✓ .next directory created successfully"; \
        ls -la .next/; \
    else \
        echo "❌ ERROR: .next directory not found"; \
        exit 1; \
    fi && \
    \
    if [ -d ".next/standalone" ]; then \
        echo "✓ Standalone build created successfully"; \
        ls -la .next/standalone/; \
    else \
        echo "❌ ERROR: Standalone build not found"; \
        exit 1; \
    fi && \
    \
    echo "=== Build Process Complete ==="

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy custom server file
COPY --from=builder --chown=nextjs:nodejs /app/server.ts ./server.ts

# Copy the Next.js build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/server ./server
COPY --from=builder --chown=nextjs:nodejs /app/.next/package.json ./package.json

# Try to copy standalone server if it exists, otherwise skip
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/server.js ./standalone-server.js 2>/dev/null || echo "Standalone server not found, using custom server"

# Copy Prisma schema and generated client
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy only production node_modules for runtime
# Note: We don't prune dev dependencies here since they were already filtered during deps stage
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Verify Prisma CLI is available in runtime
RUN npx prisma --version || echo "Warning: Prisma CLI not available in runtime"

# Copy entrypoint script and make it executable
COPY --from=builder /app/scripts ./scripts
RUN chmod +x ./scripts/docker-entrypoint.sh

# Install postgresql-client and wget for database connectivity testing and health checks
USER root
RUN apk update && apk add --no-cache postgresql-client wget bash
USER nextjs

# Create uploads directory with proper permissions
USER root
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads
USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# Add healthcheck using the new health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use our custom entrypoint script
CMD ["./scripts/docker-entrypoint.sh"]
