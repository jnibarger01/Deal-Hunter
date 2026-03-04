import dotenv from 'dotenv';
import { z } from 'zod';
import logger from './logger';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  API_VERSION: z.string().default('v1'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  GEMINI_API_KEY: z.string().optional(),
  EBAY_API_KEY: z.string().optional(),
  EBAY_APP_ID: z.string().optional(),
  FACEBOOK_API_KEY: z.string().optional(),
  MARKETPLACE_DELETE_TOKEN: z.string().optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  AUTH_REQUIRE_VERIFIED_EMAIL: z.string().default('true'),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.string().default('30'),
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS: z.string().default('24'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.string().default('info'),
});

let env: z.infer<typeof envSchema>;

try {
  env = envSchema.parse(process.env);
  if (env.NODE_ENV === 'production' || env.NODE_ENV === 'staging') {
    const missingSmtp = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'].filter(
      (key) => !process.env[key]
    );
    if (missingSmtp.length > 0) {
      throw new Error(`Missing required SMTP env vars for ${env.NODE_ENV}: ${missingSmtp.join(', ')}`);
    }
  }
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
    ebay: env.EBAY_API_KEY ?? env.EBAY_APP_ID,
    facebook: env.FACEBOOK_API_KEY,
  },
  auth: {
    requireVerifiedEmail: env.AUTH_REQUIRE_VERIFIED_EMAIL.toLowerCase() === 'true',
    frontendUrl: env.FRONTEND_URL,
    passwordResetTokenTtlMinutes: parseInt(env.PASSWORD_RESET_TOKEN_TTL_MINUTES, 10),
    emailVerificationTokenTtlHours: parseInt(env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS, 10),
  },
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : undefined,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
  },
  marketplace: {
    deleteToken: env.MARKETPLACE_DELETE_TOKEN,
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
  isStaging: env.NODE_ENV === 'staging',
  isTest: env.NODE_ENV === 'test',
};

export default config;
