import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedis } from '../services/redis.js';

export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // per user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  store: new RedisStore({ sendCommand: (...args) => getRedis().call(...args) }),
});

export const aiDailyQuota = async (req, res, next) => {
  const redis = getRedis();
  const userId = req.user.id;
  const plan = req.user.plan || 'free';
  const limit = plan === 'pro' ? 500 : 30;

  const key = `ai:quota:${userId}:${new Date().toISOString().slice(0,10)}`;
  const used = await redis.incr(key);
  if (used === 1) await redis.expire(key, 86400);

  if (used > limit) {
    return res.status(429).json({ code: 'AI_DAILY_QUOTA_EXCEEDED', limit });
  }
  next();
};
