# Frontend Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy configuration files
COPY frontend/package*.json ./frontend/
COPY frontend/vite.config.ts ./frontend/
COPY frontend/tsconfig.json ./frontend/

# Install dependencies
WORKDIR /app/frontend
RUN npm ci

# Copy source code
COPY frontend/index.html ./
COPY frontend/src ./src

# Build the application
RUN npm run build

# Runtime stage for local frontend access on port 5173
FROM node:20-alpine AS runner

WORKDIR /app/frontend
COPY --from=builder /app/frontend/package*.json ./
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/dist ./dist

EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
