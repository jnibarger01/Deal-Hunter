# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Remove .env if it exists to avoid baking secrets, though we cleaned vite config anyway
RUN rm -f .env
RUN npm run build

# Stage 2: Setup the server
FROM node:18-alpine
WORKDIR /app

# Copy server dependencies
COPY server/package.json server/package-lock.json* ./server/
WORKDIR /app/server
# We need dependencies (like tsx) valid for production now that they are in 'dependencies'
RUN npm install

# Return to root for final assembly
WORKDIR /app
COPY --from=frontend-builder /app/dist ./dist
COPY --from=frontend-builder /app/server ./server

# Expose port and start
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["npx", "tsx", "server/index.js"]
