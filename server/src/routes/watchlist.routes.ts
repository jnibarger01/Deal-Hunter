import { Router } from 'express';
import { body, param } from 'express-validator';
import watchlistController from '../controllers/watchlist.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

// All watchlist routes require authentication
router.use(authenticate);

const addValidation = [
  body('dealId').isString().notEmpty().withMessage('Valid deal ID is required'),
  body('notes').optional().trim(),
];

const dealIdParamValidation = [
  param('dealId').isString().notEmpty().withMessage('Valid deal ID is required'),
];

router.get('/', watchlistController.getWatchlist);
router.post('/', validate(addValidation), watchlistController.addToWatchlist);
router.delete('/:dealId', validate(dealIdParamValidation), watchlistController.removeFromWatchlist);
router.patch('/:dealId/notes', validate(dealIdParamValidation), watchlistController.updateNotes);

export default router;
