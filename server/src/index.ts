import app from './app';
import config from './config/env';
import logger from './config/logger';
import prisma from './config/prisma';
import { ingestCraigslistFromFeeds } from './services/craigslist';

const CRAIGSLIST_KIND = 'craigslist_rss';

const getCraigslistSchedulerUrls = async () => {
  const persistedSources = await prisma.ingestSource.findMany({
    where: { kind: CRAIGSLIST_KIND, enabled: true },
    orderBy: { createdAt: 'asc' },
  });

  const persistedUrls = persistedSources
    .map((source) => {
      const configValue = source.config;
      if (!configValue || typeof configValue !== 'object' || Array.isArray(configValue)) {
        return null;
      }
      const rssUrl = (configValue as { rssUrl?: unknown }).rssUrl;
      return typeof rssUrl === 'string' && rssUrl.trim().length > 0 ? rssUrl.trim() : null;
    })
    .filter((value): value is string => Boolean(value));

  return persistedUrls.length > 0 ? persistedUrls : config.craigslist.rssUrls;
};

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

    if (config.craigslist.schedulerEnabled) {
      const intervalMs = Math.max(1, config.craigslist.ingestIntervalMinutes) * 60_000;
      let ingestInProgress = false;

      const runCraigslistIngest = async () => {
        if (ingestInProgress) {
          logger.warn('Craigslist ingest skipped (previous run still in progress)');
          return;
        }

        ingestInProgress = true;
        try {
          const rssUrls = await getCraigslistSchedulerUrls();

          if (rssUrls.length === 0) {
            logger.info('Craigslist ingest skipped (no enabled feed URLs configured)');
            return;
          }

          const results = await ingestCraigslistFromFeeds(rssUrls, config.craigslist.maxPerFeed);

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

      const schedulerUrls = await getCraigslistSchedulerUrls();
      logger.info(
        `Craigslist scheduler enabled: ${schedulerUrls.length} feed(s), every ${config.craigslist.ingestIntervalMinutes} minute(s)`
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
