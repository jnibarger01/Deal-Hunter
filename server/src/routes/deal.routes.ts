import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, query } from 'express-validator';
import dealController from '../controllers/deal.controller';
import { validate } from '../middleware/validation';
import { authenticate, authorize } from '../middleware/auth';
import prisma from '../config/database';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many ingest requests, please try again later.',
});

// Validation rules
const createDealValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('marketplace').optional().trim(),
  body('itemUrl').optional().isURL().withMessage('Valid item URL is required'),
];

const updateDealValidation = [
  body('title').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['active', 'sold', 'expired']),
];

const idParamValidation = [
  param('id').isString().notEmpty().withMessage('Valid deal ID is required'),
];

const listDealsValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'price'])
    .withMessage('Invalid sortBy value'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Invalid sortOrder value'),
  query('minDealScore').optional().isFloat({ min: 0 }).toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('status')
    .optional()
    .isIn(['active', 'sold', 'expired'])
    .withMessage('Invalid status value'),
  query('category').optional().isString().trim(),
  query('marketplace').optional().isString().trim(),
  query('search').optional().isString().trim(),
];

const ingestValidation = [
  body('source').trim().notEmpty().withMessage('Source is required'),
  body('listings')
    .isArray({ min: 1 })
    .withMessage('Listings must be a non-empty array'),
];

const validateListing = (listing: unknown) => {
  const errors: string[] = [];

  if (!listing || typeof listing !== 'object') {
    return ['Listing must be an object'];
  }

  const listingRecord = listing as Record<string, unknown>;

  if (!listingRecord.id) {
    errors.push('id is required');
  }

  if (typeof listingRecord.title !== 'string' || listingRecord.title.trim().length === 0) {
    errors.push('title is required');
  }

  if (typeof listingRecord.category !== 'string' || listingRecord.category.trim().length === 0) {
    errors.push('category is required');
  }

  const price = Number(listingRecord.price);
  if (!Number.isFinite(price) || price < 0) {
    errors.push('price must be a positive number');
  }

  return errors;
};

const toOptionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getListingId = (listing: unknown): string | undefined => {
  if (!listing || typeof listing !== 'object') {
    return undefined;
  }
  const record = listing as Record<string, unknown>;
  return typeof record.id === 'string' ? record.id : undefined;
};

// Public routes (no authentication required)
router.get('/', validate(listDealsValidation), dealController.getAllDeals);
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
      const listing = listings[index] as Record<string, unknown>;
      const listingErrors = validateListing(listing);
      if (listingErrors.length > 0) {
        const listingId = getListingId(listing);
        errors.push({ index, id: listingId, errors: listingErrors });
        continue;
      }

      try {
        const sourceId = String(listing.id);
        const title = String(listing.title);
        const category = String(listing.category);
        const price = Number(listing.price);

        await prisma.deal.upsert({
          where: { source_sourceId: { source, sourceId } },
          create: {
            source,
            sourceId,
            title,
            description: toOptionalString(listing.description),
            price,
            condition: toOptionalString(listing.condition),
            category,
            location: toOptionalString(listing.location),
            region: toOptionalString(listing.region),
            zipPrefix: toOptionalString(listing.zipPrefix),
            url: toOptionalString(listing.url),
            views: toOptionalNumber(listing.views),
            saves: toOptionalNumber(listing.saves),
            inquiries: toOptionalNumber(listing.inquiries),
            daysListed: toOptionalNumber(listing.daysListed),
          },
          update: {
            price,
            condition: toOptionalString(listing.condition),
            location: toOptionalString(listing.location),
            region: toOptionalString(listing.region),
            zipPrefix: toOptionalString(listing.zipPrefix),
            views: toOptionalNumber(listing.views),
            saves: toOptionalNumber(listing.saves),
            inquiries: toOptionalNumber(listing.inquiries),
            daysListed: toOptionalNumber(listing.daysListed),
          },
        });
        accepted += 1;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to ingest listing';
        const listingId = getListingId(listing);
        errors.push({
          index,
          id: listingId,
          errors: [message],
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
