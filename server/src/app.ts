import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from './config/env';
import logger from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import dealRoutes from './routes/deal.routes';
import watchlistRoutes from './routes/watchlist.routes';
import portfolioRoutes from './routes/portfolio.routes';
import alertRoutes from './routes/alert.routes';
import tmvRoutes from './routes/tmv.routes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(`/api/${config.apiVersion}`, limiter);

// Logging
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Deal Hunter API is running',
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

// API Routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/deals', dealRoutes);
apiRouter.use('/watchlist', watchlistRoutes);
apiRouter.use('/portfolio', portfolioRoutes);
apiRouter.use('/alerts', alertRoutes);
apiRouter.use('/tmv', tmvRoutes);

app.use(`/api/${config.apiVersion}`, apiRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
