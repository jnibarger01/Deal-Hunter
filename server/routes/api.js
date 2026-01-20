import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiRateLimit, aiDailyQuota } from '../middleware/aiLimits.js';
import { summarize, redflags, negotiate, repairHints } from '../services/ai.js';
import { validate } from '../middleware/validate.js';
import { schemas } from '../schemas/aiSchemas.js';

const router = express.Router();

router.post('/summarize',
  requireAuth,
  aiRateLimit,
  aiDailyQuota,
  validate(schemas.summarize),
  summarize
);

router.post('/redflags',
  requireAuth,
  aiRateLimit,
  aiDailyQuota,
  validate(schemas.redflags),
  redflags
);

router.post('/negotiate',
  requireAuth,
  aiRateLimit,
  aiDailyQuota,
  validate(schemas.negotiate),
  negotiate
);

router.post('/repair-hints',
  requireAuth,
  aiRateLimit,
  aiDailyQuota,
  validate(schemas.repairHints),
  repairHints
);

export default router;
