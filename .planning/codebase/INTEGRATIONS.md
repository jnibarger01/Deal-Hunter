# External Integrations

**Analysis Date:** 2026-01-21

## APIs & External Services

**Google Generative AI (Gemini):**
- Service: Google Generative AI API for deal analysis and AI-powered insights
- What it's used for: Deal summarization, red flag detection, negotiation script generation, repair hints and analysis
- SDK/Client: `@google/genai` 1.37.0
- Model: `gemini-1.5-flash` (configured in `/home/jace-nibarger/Deal-Hunter/server/src/services/ai.service.ts`)
- Auth: Environment variable `GEMINI_API_KEY`
- Implementation: `/home/jace-nibarger/Deal-Hunter/server/src/services/ai.service.ts`
- Endpoints:
  - `POST /api/v1/deals/{id}/analyze` - Calls AIService.repairHints()
  - `POST /api/v1/deals/{id}/negotiate` - Calls AIService.negotiate()
  - Deal creation auto-triggers AI analysis

**eBay API:**
- Service: eBay Browse and Search API for marketplace deal discovery
- What it's used for: Searching eBay listings, price discovery, item filtering
- SDK/Client: Native fetch-based HTTP client
- Auth: OAuth 2.0 with client credentials flow
  - Endpoint: `https://api.ebay.com/identity/v1/oauth2/token`
  - Credentials: `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` environment variables
- Implementation: `/home/jace-nibarger/Deal-Hunter/server/src/services/ebay.service.ts`
- Endpoints:
  - `https://api.ebay.com/buy/browse/v1/item_summary/search` - Search listings
  - Supports filters: price range, location, postal code, delivery radius
- Status: Partially integrated (search functionality implemented, not actively called from routes)

**Facebook Marketplace API:**
- Service: Facebook Graph API for Marketplace listings
- Auth: Environment variable `FACEBOOK_API_KEY` (placeholder)
- Status: Declared but not implemented - placeholder only

## Data Storage

**Primary Database:**
- Provider: PostgreSQL 16
- Connection: Via Prisma ORM
- Connection string: Environment variable `DATABASE_URL` (format: `postgresql://username:password@host:port/database?schema=public`)
- Client: Prisma 5.22.0 (`@prisma/client`)
- Location: Docker service `postgres` in docker-compose.yml (port 5432)
- Schemas:
  - users
  - refresh_tokens
  - deals
  - watchlist_items
  - portfolio_items
  - alerts
  - marketplace_syncs

**File Storage:**
- Local filesystem only
- Deal images: URLs stored in `deals.imageUrl` field (external URLs, not stored locally)
- Logs: File-based logging to `/logs/error.log` and `/logs/combined.log` via Winston

**Caching:**
- Redis 7 (Alpine) - Configured in docker-compose.yml
- Status: Declared in docker-compose but not integrated in application code
- Port: 6379 (internal)
- No active cache client dependency or usage detected

## Authentication & Identity

**Auth Provider:**
- Custom implementation using JWT (JSON Web Tokens)
- Token generation: `jsonwebtoken` 9.0.2
- Token storage: In-memory Bearer tokens (passed in Authorization header)
- Password hashing: `bcryptjs` 2.4.3

**Auth Mechanism:**
- Strategy: Stateless JWT authentication
- Token types:
  - Access token: Issued on login, expires in 7 days (configurable `JWT_EXPIRES_IN`)
  - Refresh token: Stored in database, expires in 30 days (`JWT_REFRESH_EXPIRES_IN`)
- Credentials: Email + hashed password
- Implementation: `/home/jace-nibarger/Deal-Hunter/server/src/services/auth.service.ts`
- Middleware: `/home/jace-nibarger/Deal-Hunter/server/src/middleware/auth.ts`
- Endpoints:
  - `POST /api/v1/auth/register` - Create new user account
  - `POST /api/v1/auth/login` - Generate JWT access and refresh tokens
  - `POST /api/v1/auth/refresh` - Renew access token

**Token Storage:**
- RefreshToken model in database (table: `refresh_tokens`)
- Fields: id, token, userId, expiresAt, createdAt
- Refresh tokens linked to User via userId foreign key with CASCADE delete

**Authorization:**
- Role-based access control (RBAC) stored in `users.role` field
- Roles: `user` (default), `admin`
- Middleware: `authorize()` middleware in `/home/jace-nibarger/Deal-Hunter/server/src/middleware/auth.ts`
- Applied to routes: Deal deletion, admin endpoints

## Monitoring & Observability

**Logging:**
- Framework: Winston 3.17.0
- Configuration: `/home/jace-nibarger/Deal-Hunter/server/src/config/logger.ts`
- Log level: Configurable via `LOG_LEVEL` environment variable (default: info)
- Transport destinations:
  - Console output (with color formatting)
  - File: `/logs/error.log` (error level and above)
  - File: `/logs/combined.log` (all logs)
- Format: JSON with timestamp, service name metadata
- Query logging: In development, all database queries logged with duration

**Error Handling:**
- Custom AppError class: `/home/jace-nibarger/Deal-Hunter/server/src/middleware/errorHandler.ts`
- Global error handler middleware catches and logs unhandled errors
- All errors logged via Winston before response

**Error Tracking:**
- Not detected (no Sentry, Rollbar, or similar)

**Performance Monitoring:**
- Request logging via Morgan 1.10.0 middleware
- Logs HTTP method, status, response time
- Database query logging in development mode

## CI/CD & Deployment

**Hosting:**
- Docker-based containerization
- Deployment target: Any Docker-compatible platform
- Production image: `node:18-alpine`

**Docker Images:**
- Frontend builder: `node:18-alpine`
- Production runtime: `node:18-alpine`
- PostgreSQL: `postgres:16-alpine`
- Redis: `redis:7-alpine` (optional)

**CI Pipeline:**
- GitHub Actions configured: `.github/` directory present
- No specific workflow files examined, but deployment documentation available

**Build Configuration:**
- Frontend: Vite build process (`npm run build` → `dist/` directory)
- Backend: TypeScript compilation (`npm run build` → `dist/` directory)
- Environment: NODE_ENV set to `production` in production Dockerfile

**Orchestration:**
- Docker Compose for local development: `docker-compose.yml`
- Docker Compose for production: `docker-compose.prod.yml`
- Nginx configuration: Reverse proxy in `/home/jace-nibarger/Deal-Hunter/nginx/`

## Environment Configuration

**Required Environment Variables (Server):**
- `NODE_ENV` - Application environment (development/test/production)
- `PORT` - Server port (default 5000)
- `DATABASE_URL` - PostgreSQL connection string (CRITICAL)
- `JWT_SECRET` - JWT signing secret, minimum 32 characters (CRITICAL - must be randomly generated)
- `GEMINI_API_KEY` - Google Generative AI API key (CRITICAL)
- `EBAY_CLIENT_ID` - eBay OAuth client ID (required for eBay integration)
- `EBAY_CLIENT_SECRET` - eBay OAuth client secret (required for eBay integration)
- `CORS_ORIGIN` - Allowed CORS origin (e.g., http://localhost:3000)
- `LOG_LEVEL` - Winston logger level (default: info)
- `RATE_LIMIT_WINDOW_MS` - Rate limit time window in ms (default: 900000)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)

**Required Environment Variables (Frontend):**
- `VITE_API_URL` - Backend API endpoint (e.g., http://localhost:5000/api/v1)
- `GEMINI_API_KEY` - Google Generative AI API key (passed to frontend for client-side AI features)

**Development Defaults** (from docker-compose.yml):
- DATABASE_URL: `postgresql://dealhunter:dealhunter_dev_password@postgres:5432/dealhunter?schema=public`
- JWT_SECRET: `dev-jwt-secret-change-in-production-minimum-32-characters` (unsafe for production)
- CORS_ORIGIN: `http://localhost:3000`
- LOG_LEVEL: `debug`

**Secrets Storage:**
- `.env` file in `/home/jace-nibarger/Deal-Hunter/server/` (development - NOT committed)
- `.env.example` provides template with placeholder values
- Docker Compose: Environment variables passed via docker-compose.yml for dev
- Production: Environment variables set in deployment platform (Docker secrets, environment variables, etc.)

## Webhooks & Callbacks

**Incoming Webhooks:**
- Not detected - No webhook implementations found

**Outgoing Webhooks:**
- Not detected - No outbound webhook calls to external services

**Event Notifications:**
- Alert system planned but not fully integrated (Alert model exists in schema)
- User watchlist notifications: Not yet implemented
- Deal updates: No notification system detected

---

*Integration audit: 2026-01-21*
