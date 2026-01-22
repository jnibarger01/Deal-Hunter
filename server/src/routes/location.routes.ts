import { Router } from 'express';
import locationController from '../controllers/location.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Protected routes
router.get('/', authenticate, locationController.listLocations);
router.post('/', authenticate, locationController.createLocation);
router.get('/:id', authenticate, locationController.getLocationById);
router.delete('/:id', authenticate, locationController.deleteLocation);

export default router;
