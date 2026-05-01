# Server Dockerfile

# Build stage
FROM node:20-bookworm-slim AS builder

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

WORKDIR /app

# Copy workspace manifests and lockfile
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY frontend/package.json ./frontend/
COPY mcp/package.json ./mcp/
COPY server/tsconfig.json ./server/
COPY server/prisma ./server/prisma/

# Install workspace dependencies deterministically from the canonical root lockfile
RUN npm ci --workspace server

# Copy source code
COPY server/src ./server/src

# Generate Prisma client
WORKDIR /app/server
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install OpenSSL (required by Prisma) and Chromium (required by Facebook Marketplace scraping)
RUN apt-get update && apt-get install -y openssl wget chromium && rm -rf /var/lib/apt/lists/*

# Copy built artifacts and dependencies
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/prisma ./prisma

# Create logs directory
RUN mkdir -p logs

# Run as non-root in runtime container
USER node

# Expose port
EXPOSE 5000

# Start application (run migrations as a separate pre-deploy step)
CMD ["npm", "start"]
