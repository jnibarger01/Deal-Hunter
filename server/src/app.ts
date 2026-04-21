import express, { Application } from 'express';
import { randomUUID } from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from './config/env';
import logger from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import prisma from './config/database';

// Import routes
import dealRoutes from './routes/deal.routes';
import analysisRoutes from './routes/analysis.routes';

const app: Application = express();

app.set('trust proxy', config.trustProxy);

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id']?.toString() ?? randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

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
app.use('/api', limiter);

// Logging
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  morgan.token('request-id', (req) => req.headers['x-request-id']?.toString() ?? '');
  app.use(morgan(':remote-addr :method :url :status :res[content-length] - :response-time ms req_id=:request-id', {
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
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      environment: config.env,
    });
  } catch {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      environment: config.env,
    });
  }
});

// API Routes
const apiRouter = express.Router();
apiRouter.use('/deals', dealRoutes);
apiRouter.use('/', analysisRoutes);

app.use(`/api/${config.apiVersion}`, apiRouter);
app.use('/api', apiRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
