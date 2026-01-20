# Deal Hunter API

The backend API for Deal Hunter - The Bloomberg Terminal for flippers.

## Features

- 🔐 **JWT Authentication** - Secure user authentication with refresh tokens
- 📊 **Deal Management** - CRUD operations for marketplace deals
- ⭐ **Watchlist** - Save and track interesting deals
- 💼 **Portfolio** - Track purchased items and profits
- 🔔 **Alerts** - Custom notifications for deal criteria
- 🛡️ **Security** - Rate limiting, helmet, CORS, input validation
- 🧪 **Testing** - Comprehensive test coverage with Jest
- 📝 **Logging** - Winston logger with multiple transports
- 🐳 **Docker** - Containerized for easy deployment

## Tech Stack

- **Runtime:** Node.js 20
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT (jsonwebtoken)
- **Validation:** express-validator + Zod
- **Testing:** Jest + Supertest
- **Logging:** Winston
- **Security:** Helmet, CORS, bcryptjs

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm or yarn

## Quick Start

### 1. Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate
```

### 2. Environment Setup

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT (minimum 32 characters)
- Other optional configurations

### 3. Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Seed database with sample data
npm run prisma:seed

# Open Prisma Studio (optional)
npm run prisma:studio
```

### 4. Run Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:integration` - Run integration tests only
- `npm run lint` - Lint code
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:seed` - Seed database

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/profile` - Get user profile (protected)

### Deals
- `GET /api/v1/deals` - Get all deals (with filters, search, pagination)
- `GET /api/v1/deals/:id` - Get deal by ID
- `POST /api/v1/deals` - Create deal (admin only)
- `PUT /api/v1/deals/:id` - Update deal (admin only)
- `DELETE /api/v1/deals/:id` - Delete deal (admin only)
- `GET /api/v1/deals/categories` - Get all categories
- `GET /api/v1/deals/marketplaces` - Get all marketplaces
- `GET /api/v1/deals/stats` - Get deal statistics

### Watchlist
- `GET /api/v1/watchlist` - Get user's watchlist (protected)
- `POST /api/v1/watchlist` - Add deal to watchlist (protected)
- `DELETE /api/v1/watchlist/:dealId` - Remove from watchlist (protected)
- `PATCH /api/v1/watchlist/:dealId/notes` - Update notes (protected)

### Portfolio (Coming Soon)
- `GET /api/v1/portfolio` - Get user's portfolio items

### Alerts (Coming Soon)
- `GET /api/v1/alerts` - Get user's alerts

## Docker Deployment

### Development

```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production

```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run integration tests only
npm run test:integration
```

## Database Schema

Key models:
- **User** - User accounts with authentication
- **RefreshToken** - JWT refresh tokens
- **Deal** - Marketplace deals with AI analysis
- **WatchlistItem** - User's saved deals
- **PortfolioItem** - Purchased items tracking
- **Alert** - Custom deal alerts
- **MarketplaceSync** - Marketplace sync status

See `prisma/schema.prisma` for full schema definition.

## Security

- JWT-based authentication with refresh tokens
- Password hashing with bcryptjs (10 rounds)
- Rate limiting (100 requests per 15 minutes by default)
- Helmet for security headers
- CORS configuration
- Input validation on all endpoints
- SQL injection prevention via Prisma ORM
- Non-root Docker user

## Error Handling

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error message here",
    "stack": "Stack trace (development only)"
  }
}
```

## Response Format

Success responses:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Ensure tests pass
6. Submit a pull request

## License

MIT
