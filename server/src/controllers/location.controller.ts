import { Request, Response, NextFunction } from 'express';
import { LocationService } from '../services/location.service';

export class LocationController {
    async listLocations(req: Request, res: Response, next: NextFunction) {
        try {
            const items = LocationService.list();
            res.status(200).json({
                success: true,
                data: { items },
            });
        } catch (error) {
            next(error);
        }
    }

    async getLocationById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const location = LocationService.getById(id);

            if (!location) {
                return res.status(404).json({
                    success: false,
                    message: 'Location not found',
                });
            }

            res.status(200).json({
                success: true,
                data: { location },
            });
        } catch (error) {
            next(error);
        }
    }

    async createLocation(req: Request, res: Response, next: NextFunction) {
        try {
            const location = await LocationService.create(req.body);
            res.status(201).json({
                success: true,
                data: { location },
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteLocation(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            LocationService.delete(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

export default new LocationController();
