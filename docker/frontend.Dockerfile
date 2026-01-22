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
RUN npm install

# Copy source code
COPY frontend/index.html ./
COPY frontend/src ./src

# Build the application
RUN npm run build

# Assets stage (to be copied by Nginx)
FROM alpine:latest AS assets
WORKDIR /app
COPY --from=builder /app/frontend/dist ./dist
CMD ["echo", "Frontend assets built"]
