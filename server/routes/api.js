import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiRateLimit, aiDailyQuota } from '../middleware/aiLimits.js';
import { summarize, redflags, negotiate, repairHints } from '../services/ai.js';
import { searchEbay } from '../services/ebay.js';
import * as locations from '../services/locations.js';
// Using .ts extension for tsx loader resolution
import TMVService from '../src/services/tmv.service.ts';
import { validate } from '../middleware/validate.js';
import { schemas } from '../schemas/aiSchemas.js';

const router = express.Router();

// --- Deal Search ---
router.get('/search', requireAuth, async (req, res, next) => {
  try {
    const { query, locationId, filters, radius } = req.query;
    let loc = null;

    if (locationId) {
      loc = locations.getLocationById(locationId);
    }

    // Parse filters if they come as string
    let parsedFilters = filters;
    if (typeof filters === 'string') {
      try { parsedFilters = JSON.parse(filters); } catch { }
    }

    const results = await searchEbay({
      query,
      location: loc,
      radiusMiles: radius || loc?.radiusMiles,
      filters: parsedFilters
    });

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// --- Locations ---
router.get('/locations', requireAuth, (req, res) => {
  res.json({ items: locations.listLocations() });
});

router.post('/locations', requireAuth, async (req, res, next) => {
  try {
    const loc = await locations.createLocation(req.body);
    res.json(loc);
  } catch (err) {
    next(err);
  }
});

router.put('/locations/:id', requireAuth, async (req, res, next) => {
  try {
    const loc = await locations.updateLocation(req.params.id, req.body);
    res.json(loc);
  } catch (err) {
    next(err);
  }
});

router.delete('/locations/:id', requireAuth, (req, res) => {
  try {
    locations.deleteLocation(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// --- TMV Engine ---
router.post('/tmv/analyze', requireAuth, async (req, res, next) => {
  try {
    // TMVService is an object with computeDecisionPayload method
    const decision = TMVService.computeDecisionPayload(req.body);
    res.json(decision);
  } catch (err) {
    next(err);
  }
});

// --- AI Features ---
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
