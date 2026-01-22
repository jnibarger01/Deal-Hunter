# Server Dockerfile (placeholder)
FROM node:20-alpine
WORKDIR /app
COPY server/package.json server/tsconfig.json ./
RUN echo "placeholder"
