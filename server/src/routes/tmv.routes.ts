import { Router } from 'express';
import { body } from 'express-validator';
import tmvController from '../controllers/tmv.controller';
import { validate } from '../middleware/validation';

const router = Router();

const computeValidation = [
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('listingPrice').isFloat({ min: 0 }).withMessage('Listing price must be a positive number'),
  body('soldListings')
    .isArray({ min: 1 })
    .withMessage('Sold listings array is required'),
  body('soldListings.*.listingId').trim().notEmpty(),
  body('soldListings.*.itemPrice').isFloat({ min: 0 }),
  body('soldListings.*.shippingCost').isFloat({ min: 0 }),
  body('soldListings.*.soldDate').isISO8601(),
  body('soldListings.*.rawCondition').trim().notEmpty(),
  body('soldListings.*.title').trim().notEmpty(),
  body('soldListings.*.category').trim().notEmpty(),
  body('conditionFilter').optional().isString(),
  body('maxAgeDays').optional().isFloat({ min: 1 }),
  body('marketMetrics').optional().isObject(),
  body('marketMetrics.activeListingsCount').optional().isFloat({ min: 0 }),
  body('marketMetrics.avgDaysToSell').optional().isFloat({ min: 0 }),
  body('marketMetrics.sellThroughRate').optional().isFloat({ min: 0, max: 1 }),
  body('marketMetrics.recentSalesCount30d').optional().isFloat({ min: 0 }),
  body('shippingPolicy').optional().isObject(),
  body('shippingPolicy.buyerShippingCharged').optional().isFloat({ min: 0 }),
  body('shippingPolicy.shippingLabelCost').optional().isFloat({ min: 0 }),
];

router.post('/compute', validate(computeValidation), tmvController.compute);

export default router;
