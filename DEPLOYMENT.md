# Deal Hunter - Deployment Guide

Complete guide for deploying Deal Hunter to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Docker Deployment](#docker-deployment)
5. [Cloud Deployment Options](#cloud-deployment-options)
6. [CI/CD Setup](#cicd-setup)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required
- Server with Docker and Docker Compose installed
- PostgreSQL database (local or hosted)
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)

### Recommended
- Minimum 2GB RAM
- 2 CPU cores
- 20GB disk space
- Ubuntu 22.04 or similar Linux distribution

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/Deal-Hunter.git
cd Deal-Hunter
```

### 2. Configure Environment Variables

Create production environment file:

```bash
cp server/.env.example .env.production
```

Edit `.env.production` with production values:

```env
# Server
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database - Use production database URL
DATABASE_URL="postgresql://user:password@host:5432/dealhunter?schema=public"

# JWT - Generate strong secrets
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-use-openssl-rand-base64-32"
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# API Keys
GEMINI_API_KEY=your-gemini-api-key
EBAY_API_KEY=your-ebay-api-key
FACEBOOK_API_KEY=your-facebook-api-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS - Set to your frontend domain
CORS_ORIGIN=https://yourdomain.com

# Logging
LOG_LEVEL=info
```

### 3. Generate Secure Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate secure passwords
openssl rand -base64 24
```

## Database Setup

### Option 1: Managed Database (Recommended)

Use a managed PostgreSQL service:
- **AWS RDS**
- **Google Cloud SQL**
- **DigitalOcean Managed Databases**
- **Supabase**
- **Railway**

### Option 2: Self-Hosted Database

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE dealhunter;
CREATE USER dealhunter WITH ENCRYPTED PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE dealhunter TO dealhunter;
\q
```

### Run Migrations

```bash
cd server
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed  # Optional: seed with sample data
```

## Docker Deployment

### 1. Build Docker Images

```bash
# Build backend
cd server
docker build -t dealhunter-server:latest .

# Build frontend
cd ..
docker build -t dealhunter-frontend:latest -f Dockerfile.dev .
```

### 2. Start Services

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 3. Verify Deployment

```bash
# Health check
curl http://localhost:5000/health

# Expected response:
# {"success":true,"message":"Deal Hunter API is running","timestamp":"...","environment":"production"}
```

## Cloud Deployment Options

### AWS (ECS/Fargate)

1. **Push images to ECR**
```bash
aws ecr create-repository --repository-name dealhunter-server
aws ecr create-repository --repository-name dealhunter-frontend

# Tag and push
docker tag dealhunter-server:latest <account-id>.dkr.ecr.region.amazonaws.com/dealhunter-server:latest
docker push <account-id>.dkr.ecr.region.amazonaws.com/dealhunter-server:latest
```

2. **Create ECS cluster and service**
3. **Set up RDS for PostgreSQL**
4. **Configure ALB for load balancing**
5. **Set up CloudWatch for monitoring**

### DigitalOcean

1. **Create Droplet** (2GB RAM minimum)
2. **Install Docker**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

3. **Deploy with Docker Compose**
```bash
git clone your-repo
cd Deal-Hunter
docker-compose -f docker-compose.prod.yml up -d
```

### Railway

1. **Connect GitHub repository**
2. **Add PostgreSQL service**
3. **Configure environment variables**
4. **Deploy automatically on push**

### Vercel (Frontend) + Railway (Backend)

**Frontend (Vercel):**
1. Connect GitHub repo
2. Configure build command: `npm run build`
3. Set environment variables

**Backend (Railway):**
1. Create new project
2. Add PostgreSQL database
3. Deploy from GitHub
4. Set environment variables

## CI/CD Setup

### GitHub Actions

The repository includes CI/CD workflows:

1. **`.github/workflows/ci.yml`** - Runs on every push
   - Builds frontend and backend
   - Runs tests
   - Checks Docker builds
   - Security audit

2. **`.github/workflows/cd.yml`** - Deploys to production
   - Builds Docker images
   - Pushes to Docker Hub
   - Deploys to production server

### Required GitHub Secrets

Go to repository Settings → Secrets → Actions:

```
DOCKER_USERNAME - Docker Hub username
DOCKER_PASSWORD - Docker Hub password/token
PRODUCTION_HOST - Production server IP/domain
PRODUCTION_USER - SSH username
PRODUCTION_SSH_KEY - SSH private key
PRODUCTION_URL - Production URL for health check
SLACK_WEBHOOK - Slack webhook for notifications (optional)
```

### Set Up SSH Key

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions"

# Copy public key to server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server

# Add private key to GitHub Secrets
cat ~/.ssh/id_ed25519
```

## Monitoring & Maintenance

### Health Checks

```bash
# API health
curl https://api.yourdomain.com/health

# Database connection
docker exec dealhunter-server-prod npx prisma db pull
```

### Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service
docker-compose -f docker-compose.prod.yml logs -f server

# View last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 server
```

### Database Backups

Automated backups run daily via GitHub Actions (`.github/workflows/database-backup.yml`).

Manual backup:

```bash
# Backup
docker exec dealhunter-postgres-prod pg_dump -U dealhunter dealhunter > backup.sql

# Restore
docker exec -i dealhunter-postgres-prod psql -U dealhunter dealhunter < backup.sql
```

### Updates & Maintenance

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker exec dealhunter-server-prod npx prisma migrate deploy

# Clean up old images
docker system prune -af
```

## SSL/HTTPS Setup

### Using Let's Encrypt (Certbot)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
sudo certbot renew --dry-run
```

### Nginx Configuration

Create `nginx/nginx.conf`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # API
    location /api {
        proxy_pass http://server:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Frontend
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

## Troubleshooting

### Common Issues

**1. Database connection failed**
```bash
# Check database is running
docker-compose ps
# Check connection string
docker-compose exec server printenv DATABASE_URL
# Test connection
docker-compose exec server npx prisma db pull
```

**2. Port already in use**
```bash
# Find process using port 5000
sudo lsof -i :5000
# Kill process
sudo kill -9 <PID>
```

**3. Out of memory**
```bash
# Check memory usage
docker stats
# Increase server RAM or add swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**4. Migration failed**
```bash
# Reset database (CAUTION: deletes all data)
docker-compose exec server npx prisma migrate reset
# Or manually fix and retry
docker-compose exec server npx prisma migrate deploy
```

### Performance Issues

1. **Enable Redis caching** (already in docker-compose.prod.yml)
2. **Add database indexes** (already in schema.prisma)
3. **Use CDN for static assets**
4. **Enable gzip compression** in Nginx
5. **Optimize database queries**

### Security Checklist

- [ ] Strong JWT secret (32+ characters)
- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] Database password strong
- [ ] Rate limiting enabled
- [ ] CORS configured correctly
- [ ] Security headers (Helmet)
- [ ] Regular backups automated
- [ ] Dependencies updated
- [ ] Logs monitored

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/Deal-Hunter/issues
- Documentation: See README.md files

## Next Steps

After deployment:
1. Set up monitoring (Datadog, New Relic, or Sentry)
2. Configure alerts for errors and downtime
3. Set up analytics (Google Analytics, Mixpanel)
4. Implement marketplace integrations
5. Add email notifications
6. Set up regular security audits
