# Frontend Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests and lockfile
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY server/package.json ./server/
COPY frontend/vite.config.ts ./frontend/
COPY frontend/tsconfig.json ./frontend/

# Install workspace dependencies deterministically from the canonical root lockfile
RUN npm ci --workspace frontend

# Copy source code
COPY frontend/index.html ./frontend/
COPY frontend/src ./frontend/src

# Build the application
WORKDIR /app/frontend
RUN npm run build

# Runtime stage for local frontend access on port 5173
FROM node:20-alpine AS runner

WORKDIR /app/frontend
COPY --from=builder /app/frontend/package.json ./package.json
COPY --from=builder /app/frontend/dist ./dist
COPY --from=builder /app/node_modules /app/node_modules

EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
