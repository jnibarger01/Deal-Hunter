# Server Dockerfile

# Build stage
FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy configuration files
COPY server/package*.json ./server/
COPY server/tsconfig.json ./server/
COPY server/prisma ./server/prisma/

# Install dependencies
WORKDIR /app/server
RUN npm ci

# Copy source code
COPY server/src ./src

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apt-get update && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*

# Copy built artifacts and dependencies
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/package*.json ./
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/prisma ./prisma

# Create logs directory
RUN mkdir -p logs

# Run as non-root in runtime container
USER node

# Expose port
EXPOSE 5000

# Start application (run migrations as a separate pre-deploy step)
CMD ["npm", "start"]
