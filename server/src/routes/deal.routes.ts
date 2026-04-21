import { Router } from 'express';
import { param, query } from 'express-validator';
import dealController from '../controllers/deal.controller';
import { validate } from '../middleware/validation';

const router = Router();

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
  query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('status')
    .optional()
    .isIn(['active', 'sold', 'expired'])
    .withMessage('Invalid status value'),
  query('category').optional().isString().trim(),
  query('search').optional().isString().trim(),
];

router.get('/', validate(listDealsValidation), dealController.getAllDeals);
router.get('/:id', validate(idParamValidation), dealController.getDealById);

export default router;
