import dotenv from 'dotenv';
import { z } from 'zod';
import logger from './logger';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  API_VERSION: z.string().default('v1'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  GEMINI_API_KEY: z.string().optional(),
  EBAY_API_KEY: z.string().optional(),
  FACEBOOK_API_KEY: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.string().default('info'),
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

export const config = {
  env: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  apiVersion: env.API_VERSION,
  database: {
    url: env.DATABASE_URL,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  apiKeys: {
    gemini: env.GEMINI_API_KEY,
    ebay: env.EBAY_API_KEY,
    facebook: env.FACEBOOK_API_KEY,
  },
  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    max: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  },
  cors: {
    origin: env.CORS_ORIGIN.split(','),
  },
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
};

export default config;
