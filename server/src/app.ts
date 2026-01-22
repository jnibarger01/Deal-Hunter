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
import locationRoutes from './routes/location.routes';

const app: Application = express();
// ...
// API Routes
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/deals', dealRoutes);
apiRouter.use('/watchlist', watchlistRoutes);
apiRouter.use('/portfolio', portfolioRoutes);
apiRouter.use('/alerts', alertRoutes);
apiRouter.use('/tmv', tmvRoutes);
apiRouter.use('/locations', locationRoutes);

app.use(`/api/${config.apiVersion}`, apiRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
