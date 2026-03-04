import app from './app';
import config from './config/env';
import logger from './config/logger';
import prisma from './config/database';
import { ingestCraigslistFromFeeds } from './services/craigslist';

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port} in ${config.env} mode`);
      logger.info(`📡 API: http://localhost:${config.port}/api/${config.apiVersion}`);
      logger.info(`🏥 Health: http://localhost:${config.port}/health`);
    });

    if (config.craigslist.schedulerEnabled && config.craigslist.rssUrls.length > 0) {
      const intervalMs = Math.max(1, config.craigslist.ingestIntervalMinutes) * 60_000;
      let ingestInProgress = false;

      const runCraigslistIngest = async () => {
        if (ingestInProgress) {
          logger.warn('Craigslist ingest skipped (previous run still in progress)');
          return;
        }

        ingestInProgress = true;
        try {
          const results = await ingestCraigslistFromFeeds(
            config.craigslist.rssUrls,
            config.craigslist.maxPerFeed
          );

          const summary = results.reduce(
            (acc, item) => {
              acc.fetched += item.fetched;
              acc.accepted += item.accepted;
              acc.rejected += item.rejected;
              return acc;
            },
            { fetched: 0, accepted: 0, rejected: 0 }
          );

          logger.info('Craigslist ingest completed', summary);
        } catch (error) {
          logger.error('Craigslist ingest failed', error);
        } finally {
          ingestInProgress = false;
        }
      };

      logger.info(
        `Craigslist scheduler enabled: ${config.craigslist.rssUrls.length} feed(s), every ${config.craigslist.ingestIntervalMinutes} minute(s)`
      );

      setInterval(() => {
        void runCraigslistIngest();
      }, intervalMs);

      void runCraigslistIngest();
    }

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        await prisma.$disconnect();
        logger.info('Database connection closed');

        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
