# Deal Hunter

> **The Bloomberg Terminal for Flippers.**

Deal Hunter is a sophisticated platform designed to help flippers identify, evaluate, and track high-margin opportunities across various marketplaces. It combines real-time data integration, AI-driven analysis, and comprehensive portfolio management to give flippers a competitive edge.

## 🚀 Features

- **📊 Intelligent Dashboard**: Get a bird's-eye view of your flipping operations, including active deals, profit potential, and portfolio performance.
- **🔍 Deal Discovery & Ranking**: Advanced algorithms to rank deals based on profitability, liquidity, and risk.
- **🤖 AI-Powered Analysis**: Integrated with Google Gemini AI to provide deeper insights into item value and market trends.
- **🔌 Marketplace Integration**: Seamlessly connects with major platforms (e.g., eBay) to fetch live pricing and listing data.
- **📈 Portfolio Tracking**: Manage your inventory, track costs, and monitor realized profits.
- **🔔 Real-time Alerts**: Never miss a deal with customizable alerts based on your specific criteria.
- **🧮 TMV Calculator**: (Coming Soon) True Market Value calculator to estimate selling price with high precision.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Routing**: [React Router](https://reactrouter.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: Modern CSS with CSS Modules

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) with [TypeScript](https://www.typescriptlang.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Database**: PostgreSQL (dev/staging/production)
- **Validation**: [Zod](https://zod.dev/) & [Express Validator](https://express-validator.github.io/)
- **Security**: JWT, Helmet, Rate Limiting, Bcrypt

### AI & Integrations
- **AI Engine**: [Google Gemini AI](https://ai.google.dev/)
- **External APIs**: eBay Integration

## 📦 Infrastructure & Deployment

- **Containerization**: [Docker](https://www.docker.com/) & Docker Compose
- **Proxy/Web Server**: [Nginx](https://www.nginx.com/)
- **CI/CD**: GitHub Actions
- **PaaS**: [Render](https://render.com/)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Docker and Docker Compose
- PostgreSQL (if running locally without Docker)

### Local Development (with Docker)

The easiest way to get started is using Docker Compose:

1.  Clone the repository:
    ```bash
    git clone https://github.com/jnibarger01/Deal-Hunter.git
    cd Deal-Hunter
    ```

2.  Start the services:
    ```bash
    npm run docker:up
    ```

3.  Access the application:
    - Frontend: `http://localhost:5173`
    - Backend: `http://localhost:5000`
    - Nginx Proxy: `http://localhodst:8080`

### Local Development (Manual, PostgreSQL)

1. **Install dependencies (root workspace):**
   ```bash
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp server/.env.example server/.env
   ```
   `server/.env.example` defaults to local Docker Postgres on `localhost:5433`:
   ```env
   DATABASE_URL="postgresql://dealhunter:dealhunter_dev_password@localhost:5433/dealhunter?schema=public"
   ```

3. **Prisma client generation:**
   ```bash
   cd server
   npm run prisma:generate
   ```

4. **Initialize/update the PostgreSQL schema:**
   ```bash
   npm run prisma:migrate
   ```

5. **Run backend + frontend:**
   From the project root:
   ```bash
   cd ..
   npm run dev
   ```

## 🔌 API Contract (MVP)

Base URL: `http://localhost:5000/api/v1`

- `POST /tmv/calculate`
  - Body: `{ "dealId": "<uuid>" }`
  - Response: `{ dealId, tmv, confidence, sampleCount, volatility, liquidityScore, estimatedDaysToSell, calculatedAt }`
- `GET /tmv/:dealId`
  - Response: same shape as TMV calculate
- `POST /score`
  - Body: `{ "dealId": "<uuid>", "feeAssumptions": { "platformFeeRate": 0.13, "shippingCost": 12, "fixedFees": 1.5 } }`
  - Response: `{ dealId, profitMargin, velocityScore, riskScore, compositeRank, feesApplied, calculatedAt }`
- `GET /ranked?limit=50`
  - Response: `RankedDeal[]` with embedded `tmv` and `score`

Legacy routes under `/api/v1/deals` remain available for CRUD and ingest.

## 🔒 Developer Hardening

- Normalize line endings/encoding via `.gitattributes` (UTF-8 + LF)
- Install local git hooks:
  ```bash
  ./scripts/install-git-hooks.sh
  ```
  This enables a pre-commit binary-file guard.

## 🚢 Production Docs

- Deployment and operations runbook: `docs/production.md`
- Release checklist: `docs/release-checklist.md`

## 🏗️ Project Structure

- `frontend/`: React application (Vite-based)
- `server/`: Express backend with Prisma ORM
- `docker/`: Dockerfiles for server, frontend, and nginx
- `nginx/`: Nginx configuration files
- `.github/`: CI/CD workflows

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details (if applicable).
