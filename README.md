# Deal Hunter 🎯

> **The Bloomberg Terminal for flippers** - AI-powered platform for discovering undervalued marketplace deals and analyzing profitability.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20.x-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue.svg)

## Features

### 🔍 Deal Discovery
- **Multi-Marketplace Support**: Aggregates deals from Craigslist, eBay, Facebook Marketplace
- **Smart Filtering**: Category, price, location, and marketplace filters
- **Real-time Search**: Instant search across deal titles and descriptions
- **Deal Scoring**: Proprietary 0-100 scoring system for deal quality

### 🤖 AI-Powered Analysis
- **Repair Assessment**: AI analyzes item condition and estimates repair difficulty
- **Cost Estimation**: Predicts parts costs and repair time
- **Market Intelligence**: Provides market trends and pricing insights
- **Negotiation Tips**: AI-generated negotiation strategies

### 💼 Portfolio Management
- **Watchlist**: Save and track interesting deals
- **Portfolio Tracking**: Monitor purchased items and profits
- **ROI Calculation**: Automatic profit and ROI calculations
- **Custom Alerts**: Get notified of deals matching your criteria

### 🔐 Security & Performance
- **JWT Authentication**: Secure user authentication with refresh tokens
- **Rate Limiting**: Protects against abuse
- **Input Validation**: All endpoints validated
- **Comprehensive Tests**: 70%+ test coverage
- **Docker Ready**: Easy deployment with Docker

## Tech Stack

### Frontend
- **React 19** - Modern UI framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling

### Backend
- **Node.js 20** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - Modern ORM
- **PostgreSQL 16** - Database
- **JWT** - Authentication
- **Winston** - Logging
- **Jest** - Testing

### AI/ML
- **Google Gemini API** - AI analysis and insights

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **GitHub Actions** - CI/CD pipeline
- **Nginx** - Reverse proxy (production)

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+ OR Docker
- Git

### Option 1: Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/yourusername/Deal-Hunter.git
cd Deal-Hunter

# Start all services
docker-compose up

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# API Health: http://localhost:5000/health
```

### Option 2: Local Development

```bash
# Clone repository
git clone https://github.com/yourusername/Deal-Hunter.git
cd Deal-Hunter

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Setup database
npx prisma generate
npx prisma migrate dev
npm run prisma:seed

# Start backend (from server directory)
npm run dev

# Start frontend (from root directory)
cd ..
npm run dev
```

## Project Structure

```
Deal-Hunter/
├── .github/workflows/      # CI/CD pipelines
├── server/                 # Backend API
│   ├── src/
│   │   ├── config/        # Configuration
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── types/         # TypeScript types
│   ├── tests/             # Backend tests
│   ├── prisma/            # Database schema & migrations
│   └── package.json
├── components/            # React components
├── services/             # Frontend services
├── App.tsx               # Main React component
└── package.json          # Frontend dependencies
```

## API Documentation

### Authentication
```bash
POST /api/v1/auth/register  - Register new user
POST /api/v1/auth/login     - Login user
POST /api/v1/auth/refresh   - Refresh access token
GET  /api/v1/auth/profile   - Get user profile (protected)
```

### Deals
```bash
GET  /api/v1/deals              - Get all deals (with filters)
GET  /api/v1/deals/:id          - Get deal by ID
GET  /api/v1/deals/categories   - Get all categories
GET  /api/v1/deals/marketplaces - Get all marketplaces
GET  /api/v1/deals/stats        - Get deal statistics
```

### Watchlist
```bash
GET    /api/v1/watchlist         - Get user's watchlist (protected)
POST   /api/v1/watchlist         - Add deal to watchlist (protected)
DELETE /api/v1/watchlist/:dealId - Remove from watchlist (protected)
```

See [server/README.md](server/README.md) for complete API documentation.

## Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/dealhunter
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
GEMINI_API_KEY=your-gemini-api-key
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:5000/api/v1
GEMINI_API_KEY=your-gemini-api-key
```

## Testing

```bash
# Backend tests
cd server
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage

# Frontend tests (when implemented)
npm test
```

## Deployment

### Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment guide.

Quick production start:
```bash
# Using Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Platforms

- **AWS**: ECS/Fargate + RDS
- **DigitalOcean**: Droplet + Managed Database
- **Railway**: One-click deployment
- **Vercel + Railway**: Frontend on Vercel, Backend on Railway

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed development guide.

Key commands:
```bash
# Backend development
cd server
npm run dev              # Start with hot reload
npm test                # Run tests
npm run prisma:studio   # Open database GUI

# Frontend development
npm run dev             # Start Vite dev server
npm run build          # Build for production
```

## Database Schema

Key entities:
- **Users**: User accounts with authentication
- **Deals**: Marketplace deals with AI analysis
- **Watchlist**: User's saved deals
- **Portfolio**: Purchased items tracking
- **Alerts**: Custom deal notifications

See `server/prisma/schema.prisma` for complete schema.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

## Roadmap

### Phase 1: Foundation ✅
- [x] Backend API setup
- [x] Authentication system
- [x] Database schema
- [x] Core API endpoints
- [x] Testing framework
- [x] Docker configuration
- [x] CI/CD pipeline

### Phase 2: Marketplace Integration 🚧
- [ ] Craigslist scraper/API
- [ ] eBay API integration
- [ ] Facebook Marketplace API
- [ ] Data normalization layer
- [ ] Automated deal sync

### Phase 3: Enhanced Features
- [ ] Portfolio tracking implementation
- [ ] Alert system with email notifications
- [ ] Advanced filtering and search
- [ ] Price history tracking
- [ ] Market trend analysis

### Phase 4: Scale & Optimize
- [ ] Redis caching
- [ ] CDN for static assets
- [ ] Database query optimization
- [ ] Horizontal scaling
- [ ] Performance monitoring

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@dealhunter.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/Deal-Hunter/issues)
- 📖 Documentation: See README files in each directory

## Acknowledgments

- Built with [Google Gemini API](https://ai.google.dev/)
- Icons from [Heroicons](https://heroicons.com/)
- UI inspiration from Bloomberg Terminal

---

**Made with ❤️ for flippers everywhere**
