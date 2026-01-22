# Nginx Dockerfile

# Build frontend assets first (conceptually, or assume context includes them)
# In this setup, we'll use a multi-stage approach or assume we can copy from a build context.
# Since docker-compose builds sequentially or we use multi-stage in one file, 
# typically we'd do the build HERE or copy from a pre-built location.
# For simplicity with the "frontend" service being separate in compose, 
# we often use a shared volume or multi-stage in one go.
# However, the user's docker-compose has separate services.
# Let's assume we copy from the 'frontend' build context if we are running composed.
# BUT, standard practice for simple deployment:
# Nginx container is the frontend server.

FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
