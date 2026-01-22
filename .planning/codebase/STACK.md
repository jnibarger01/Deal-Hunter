# Technology Stack

**Analysis Date:** 2026-01-21

## Languages

**Primary:**
- TypeScript ~5.8.2 - Frontend and backend implementation
- JavaScript - Legacy compatibility and configuration files

**Secondary:**
- SQL/PL/pgSQL - PostgreSQL database queries and stored procedures
- CSS/JSX - Styling (inline and component-scoped)

## Runtime

**Environment:**
- Node.js 18 (Alpine) - Both frontend and backend execution
- Browser runtime - React 19.2.3 frontend execution

**Package Manager:**
- npm - Used for both root and server packages
- Lockfile: package-lock.json present in both root and `server/` directories

## Frameworks

**Core Frontend:**
- React 19.2.3 - UI framework (`/home/jace-nibarger/Deal-Hunter/App.tsx`)
- Vite 6.2.0 - Build tool and dev server configuration

**Core Backend:**
- Express 4.21.2 - HTTP server (`/home/jace-nibarger/Deal-Hunter/server/src/app.ts`)
- Prisma ORM 5.22.0 - Database abstraction layer

**Testing:**
- Jest 29.7.0 - Test runner (backend) - configured in `/home/jace-nibarger/Deal-Hunter/server/jest.config.js`
- Supertest 7.0.0 - HTTP assertion library for API testing
- ts-jest 29.2.5 - TypeScript support for Jest

**Build/Dev:**
- tsx 4.19.2 - TypeScript execution and development server
- TypeScript 5.7.2 - Compiler in server, ~5.8.2 in root
- Vite 6.2.0 - Frontend build bundler
- Vitest - Not detected (Jest used instead)

## Key Dependencies

**Critical:**

- `@prisma/client` 5.22.0 - Database ORM client (`/home/jace-nibarger/Deal-Hunter/server/src/config/database.ts`)
- `@google/genai` 1.37.0 - Google Generative AI SDK for Gemini integration (`/home/jace-nibarger/Deal-Hunter/server/src/services/ai.service.ts`)
- `express` 4.21.2 - Web framework for server routing and middleware
- `jsonwebtoken` 9.0.2 - JWT token generation and verification (`/home/jace-nibarger/Deal-Hunter/server/src/middleware/auth.ts`)
- `bcryptjs` 2.4.3 - Password hashing (`/home/jace-nibarger/Deal-Hunter/server/src/services/auth.service.ts`)
- `winston` 3.17.0 - Logger (`/home/jace-nibarger/Deal-Hunter/server/src/config/logger.ts`)

**Infrastructure:**

- `dotenv` 16.4.5 - Environment variable management
- `cors` 2.8.5 - Cross-origin resource sharing middleware
- `helmet` 8.0.0 - HTTP security headers
- `morgan` 1.10.0 - HTTP request logging middleware
- `express-rate-limit` 7.5.0 - API rate limiting (`/home/jace-nibarger/Deal-Hunter/server/src/app.ts`)
- `express-validator` 7.2.1 - Input validation middleware
- `zod` 3.24.1 - Schema validation and runtime type checking
- `react-dom` 19.2.3 - React DOM renderer

**Development:**

- @vitejs/plugin-react 5.0.0 - React fast refresh plugin for Vite
- @typescript-eslint/eslint-plugin 8.19.1 - TypeScript linting rules
- @typescript-eslint/parser 8.19.1 - TypeScript parser for ESLint
- eslint 9.18.0 - Code linter

## Configuration

**Environment:**

Frontend configuration:
- `VITE_API_URL` - Backend API endpoint (set in docker-compose.yml to `http://localhost:5000/api/v1`)
- `GEMINI_API_KEY` - Passed from docker-compose environment

Backend configuration via `.env.example`:
- `NODE_ENV` - development, test, or production
- `PORT` - Server port (default 5000)
- `API_VERSION` - API version prefix (v1)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for signing JWT tokens (minimum 32 characters recommended)
- `JWT_EXPIRES_IN` - JWT expiration duration (default 7d)
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration (default 30d)
- `GEMINI_API_KEY` - Google Generative AI API key
- `EBAY_API_KEY` - eBay marketplace API key (not actively integrated)
- `FACEBOOK_API_KEY` - Facebook marketplace API key (placeholder)
- `RATE_LIMIT_WINDOW_MS` - Rate limiting window (default 900000ms = 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default 100)
- `CORS_ORIGIN` - CORS allowed origin
- `LOG_LEVEL` - Winston logger level (info, debug, error)

**Build:**

Frontend:
- `tsconfig.json` - React JSX compilation (`jsx: react-jsx`)
- `index.html` - Vite entry point template
- Build output: `dist/` directory

Backend:
- `tsconfig.json` - Node.js ES2022 target with experimental decorators
- `tsconfig.strict.json` - Extended strict typing config
- Build output: `dist/` directory via `tsc` compiler
- Prisma schema: `/home/jace-nibarger/Deal-Hunter/server/prisma/schema.prisma`

## Database

**Provider:** PostgreSQL 16 (Alpine image)

**Client:** Prisma ORM 5.22.0 with PrismaClient

**Schema Models** (in `/home/jace-nibarger/Deal-Hunter/server/prisma/schema.prisma`):
- User - Authentication and user management
- RefreshToken - JWT refresh token tracking
- Deal - Core marketplace deal entities
- WatchlistItem - User watchlist entries
- PortfolioItem - User purchase history and outcomes
- Alert - Deal alert criteria and notifications
- MarketplaceSync - Marketplace sync status tracking

**Connection:** Via environment variable `DATABASE_URL` pointing to PostgreSQL instance

## Platform Requirements

**Development:**
- Node.js 18 (recommended Alpine variant)
- npm for package management
- PostgreSQL 16 for database
- Redis 7 (optional, configured in docker-compose.yml but not integrated)

**Production:**
- Node.js 18-alpine Docker image
- PostgreSQL 16 database
- Environment variables for secrets (JWT_SECRET, API keys, DATABASE_URL)
- Port 4000 exposed (configurable via PORT env var)

**Deployment Targets:**
- Docker containerization supported (Dockerfile.dev for development, Dockerfile for production)
- Docker Compose orchestration available (`docker-compose.yml`, `docker-compose.prod.yml`)
- Nginx reverse proxy configuration available (`/home/jace-nibarger/Deal-Hunter/nginx/` directory)

---

*Stack analysis: 2026-01-21*
