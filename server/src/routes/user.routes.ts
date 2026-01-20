import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Placeholder routes - implement controllers later
router.get('/me', (req, res) => {
  res.json({ success: true, data: { user: req.user }, message: 'User profile' });
});

export default router;
