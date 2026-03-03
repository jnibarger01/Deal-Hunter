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
- **Database**: [Prisma](https://www.prisma.io/) + SQLite (local development via `file:./dev.db`)
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
    - Nginx Proxy: `http://localhost:8080`

### Local Development (Manual, SQLite)

1. **Install dependencies (root workspace):**
   ```bash
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp server/.env.example server/.env
   ```
   `server/.env.example` defaults to:
   ```env
   DATABASE_URL="file:./dev.db"
   ```

3. **Prisma client generation:**
   ```bash
   cd server
   npm run prisma:generate
   ```

4. **Initialize/update the SQLite schema (choose one):**

   **Option A (recommended for local SQLite):**
   ```bash
   npm run prisma:db:push
   ```

   **Option B (if you want migration files during local work):**
   ```bash
   npm run prisma:migrate -- --name init_sqlite
   ```

5. **Run backend + frontend:**
   From the project root:
   ```bash
   cd ..
   npm run dev
   ```

## 🏗️ Project Structure

- `frontend/`: React application (Vite-based)
- `server/`: Express backend with Prisma ORM
- `docker/`: Dockerfiles for server, frontend, and nginx
- `nginx/`: Nginx configuration files
- `.github/`: CI/CD workflows

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details (if applicable).
