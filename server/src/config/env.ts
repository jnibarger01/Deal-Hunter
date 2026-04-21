import dotenv from 'dotenv';
import { z } from 'zod';
import logger from './logger';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  API_VERSION: z.string().default('v1'),
  DATABASE_URL: z.string(),
  EBAY_API_KEY: z.string().optional(),
  EBAY_APP_ID: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  TRUST_PROXY: z.string().default('1'),
  LOG_LEVEL: z.string().default('info'),
  CRAIGSLIST_RSS_URLS: z.string().optional(),
  CRAIGSLIST_INGEST_INTERVAL_MINUTES: z.string().default('30'),
  CRAIGSLIST_MAX_PER_FEED: z.string().default('50'),
  CRAIGSLIST_SCHEDULER_ENABLED: z.string().default('false'),
});

let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
  logger.info('Environment variables validated successfully');
} catch (error) {
  if (error instanceof z.ZodError) {
    logger.error('Environment validation error:', error.errors);
    throw new Error('Invalid environment variables. Check .env file.');
  }
  throw error;
}

const trustProxyValue = env.TRUST_PROXY.toLowerCase();
const trustProxy =
  trustProxyValue === 'true'
    ? true
    : trustProxyValue === 'false'
      ? false
      : parseInt(env.TRUST_PROXY, 10);

export const config = {
  env: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  apiVersion: env.API_VERSION,
  database: {
    url: env.DATABASE_URL,
  },
  apiKeys: {
    ebay: env.EBAY_API_KEY ?? env.EBAY_APP_ID,
  },
  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    max: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  },
  cors: {
    origin: env.CORS_ORIGIN.split(','),
  },
  craigslist: {
    rssUrls: (env.CRAIGSLIST_RSS_URLS ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    ingestIntervalMinutes: parseInt(env.CRAIGSLIST_INGEST_INTERVAL_MINUTES, 10),
    maxPerFeed: parseInt(env.CRAIGSLIST_MAX_PER_FEED, 10),
    schedulerEnabled: env.CRAIGSLIST_SCHEDULER_ENABLED.toLowerCase() === 'true',
  },
  trustProxy,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isStaging: env.NODE_ENV === 'staging',
  isTest: env.NODE_ENV === 'test',
};

export default config;
