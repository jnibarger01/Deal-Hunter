import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// All alert routes require authentication
router.use(authenticate);

// Placeholder routes - implement controllers later
router.get('/', (req, res) => {
  res.json({ success: true, data: { alerts: [] }, message: 'Alerts endpoint - To be implemented' });
});

export default router;
