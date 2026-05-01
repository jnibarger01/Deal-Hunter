import express, { Application } from 'express';
import { randomUUID } from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from './config/env';
import logger from './config/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import prisma from './config/prisma';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import dealRoutes from './routes/deal.routes';
import dealIngestRoutes from './routes/deal-ingest.routes';
import watchlistRoutes from './routes/watchlist.routes';
import portfolioRoutes from './routes/portfolio.routes';
import alertRoutes from './routes/alert.routes';
import analysisRoutes from './routes/analysis.routes';
import connectionsRoutes from './routes/connections.routes';

const app: Application = express();

app.set('trust proxy', config.trustProxy);

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id']?.toString() ?? randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

app.post('/webhooks/marketplace-account-deletion', async (req, res, next) => {
  const headerToken = req.headers['x-verification-token'] ?? req.headers['x-hub-verify-token'];
  const token = typeof headerToken === 'string' ? headerToken : undefined;

  if (!config.marketplace.deleteToken || token !== config.marketplace.deleteToken) {
    return res.status(401).send('Invalid token');
  }

  try {
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
    const userId = typeof body.userId === 'string'
      ? body.userId.trim()
      : typeof body.accountId === 'string'
        ? body.accountId.trim()
        : undefined;

    if (!email && !userId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Deletion callback requires email, userId, or accountId' },
      });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(userId ? [{ id: userId }] : []),
        ],
      },
      select: { id: true },
    });

    if (users.length === 0) {
      logger.info('Account deletion webhook processed', { deleted: false });
      return res.status(200).json({ success: true, deleted: false });
    }

    const userIds = users.map((user) => user.id);
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    logger.info('Account deletion webhook processed', { deleted: true, deletedCount: userIds.length });
    return res.status(200).json({
      success: true,
      deleted: true,
      deletedCount: userIds.length,
      ...(userIds.length === 1 ? { userId: userIds[0] } : {}),
    });
  } catch (error) {
    return next(error);
  }
});

const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/deals', dealIngestRoutes);
apiRouter.use('/deals', dealRoutes);
apiRouter.use('/watchlist', watchlistRoutes);
apiRouter.use('/portfolio', portfolioRoutes);
apiRouter.use('/alerts', alertRoutes);
apiRouter.use('/connections', connectionsRoutes);
apiRouter.use('/', analysisRoutes);

app.use(`/api/${config.apiVersion}`, apiRouter);
app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
