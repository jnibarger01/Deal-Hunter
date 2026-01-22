import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// All portfolio routes require authentication
router.use(authenticate);

// Placeholder routes - implement controllers later
router.get('/', (req, res) => {
  res.json({ success: true, data: { items: [] }, message: 'Portfolio endpoint - To be implemented' });
});

export default router;
