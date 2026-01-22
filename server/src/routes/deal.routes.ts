import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param } from 'express-validator';
import dealController from '../controllers/deal.controller';
import { validate } from '../middleware/validation';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../config/database';
import { TMVCalculator } from '../domain/tmv';
import tmvConfig from '../config/tmv';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many ingest requests, please try again later.',
});

const tmvLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many TMV requests, please try again later.',
});

// Validation rules
const createDealValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('marketValue').isFloat({ min: 0 }).withMessage('Market value must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('marketplace').trim().notEmpty().withMessage('Marketplace is required'),
  body('itemUrl').isURL().withMessage('Valid item URL is required'),
];

const updateDealValidation = [
  body('title').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('marketValue').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['active', 'sold', 'expired']),
];

const idParamValidation = [
  param('id').isString().notEmpty().withMessage('Valid deal ID is required'),
];

const ingestValidation = [
  body('source').trim().notEmpty().withMessage('Source is required'),
  body('listings')
    .isArray({ min: 1 })
    .withMessage('Listings must be a non-empty array'),
];

const validateListing = (listing: any) => {
  const errors: string[] = [];

  if (!listing || typeof listing !== 'object') {
    return ['Listing must be an object'];
  }

  if (!listing.id) {
    errors.push('id is required');
  }

  if (typeof listing.title !== 'string' || listing.title.trim().length === 0) {
    errors.push('title is required');
  }

  if (typeof listing.category !== 'string' || listing.category.trim().length === 0) {
    errors.push('category is required');
  }

  const price = Number(listing.price);
  if (!Number.isFinite(price) || price < 0) {
    errors.push('price must be a positive number');
  }

  return errors;
};

// Public routes (no authentication required)
router.get('/', dealController.getAllDeals);
router.get('/categories', dealController.getCategories);
router.get('/marketplaces', dealController.getMarketplaces);
router.get('/stats', dealController.getStats);
router.get('/:id', validate(idParamValidation), dealController.getDealById);

// POST /api/deals/ingest - Ingest new listings
router.post(
  '/ingest',
  authenticate,
  ingestLimiter,
  validate(ingestValidation),
  asyncHandler(async (req, res) => {
    const { source, listings } = req.body;
    const errors: Array<{ index: number; id?: string; errors: string[] }> = [];
    let accepted = 0;

    for (let index = 0; index < listings.length; index += 1) {
      const listing = listings[index];
      const listingErrors = validateListing(listing);
      if (listingErrors.length > 0) {
        errors.push({ index, id: listing?.id, errors: listingErrors });
        continue;
      }

      try {
        await prisma.deal.upsert({
          where: { source_sourceId: { source, sourceId: listing.id } },
          create: {
            source,
            sourceId: listing.id,
            title: listing.title,
            description: listing.description,
            price: listing.price,
            condition: listing.condition,
            category: listing.category,
            location: listing.location,
            region: listing.region,
            zipPrefix: listing.zipPrefix,
            url: listing.url,
            views: listing.views,
            saves: listing.saves,
            inquiries: listing.inquiries,
            daysListed: listing.daysListed,
          },
          update: {
            price: listing.price,
            condition: listing.condition,
            location: listing.location,
            region: listing.region,
            zipPrefix: listing.zipPrefix,
            views: listing.views,
            saves: listing.saves,
            inquiries: listing.inquiries,
            daysListed: listing.daysListed,
          },
        });
        accepted += 1;
      } catch (error: any) {
        errors.push({
          index,
          id: listing?.id,
          errors: [error?.message ?? 'Failed to ingest listing'],
        });
      }
    }

    res.json({
      accepted,
      rejected: errors.length,
      errors,
    });
  })
);

// POST /api/deals/:id/calculate-tmv
router.post(
  '/:id/calculate-tmv',
  authenticate,
  tmvLimiter,
  asyncHandler(async (req, res) => {
    const id = String(req.params.id);

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: { samples: true },
    });

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    const calculator = new TMVCalculator(tmvConfig);
    const result = calculator.calculate(deal.samples, {
      targetCondition: deal.condition,
      targetRegion: deal.region,
      targetTitle: deal.title,
      targetDescription: deal.description,
      targetCategory: deal.category,
      targetPrice: deal.price,
      demandSignals: {
        views: deal.views,
        saves: deal.saves,
        inquiries: deal.inquiries,
        daysListed: deal.daysListed,
      },
    });

    if (!result) {
      res.status(400).json({ error: 'Insufficient data for TMV' });
      return;
    }

    const tmv = await prisma.tMVResult.upsert({
      where: { dealId: id },
      create: {
        dealId: id,
        tmv: result.tmv,
        tmvNormalized: result.tmvNormalized,
        confidence: result.confidence,
        sampleCount: result.sampleCount,
        volatility: result.volatility,
        liquidityScore: result.liquidityScore,
        estimatedDaysToSell: result.estimatedDaysToSell,
        seasonalityIndex: result.seasonalityIndex,
        regionalIndex: result.regionalIndex,
      },
      update: {
        tmv: result.tmv,
        tmvNormalized: result.tmvNormalized,
        confidence: result.confidence,
        sampleCount: result.sampleCount,
        volatility: result.volatility,
        liquidityScore: result.liquidityScore,
        estimatedDaysToSell: result.estimatedDaysToSell,
        seasonalityIndex: result.seasonalityIndex,
        regionalIndex: result.regionalIndex,
      },
    });

    res.json({
      tmv,
      demandScore: result.demandScore,
      hotDeal: result.hotDeal,
    });
  })
);

// Protected routes (admin only)
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createDealValidation),
  dealController.createDeal
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validate([...idParamValidation, ...updateDealValidation]),
  dealController.updateDeal
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(idParamValidation),
  dealController.deleteDeal
);

export default router;
