import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import watchlistService from '../services/watchlist.service';
import logger from '../config/logger';

export class WatchlistController {
  async getWatchlist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const items = await watchlistService.getWatchlist(userId);

      res.status(200).json({
        success: true,
        data: { items },
      });
    } catch (error) {
      next(error);
    }
  }

  async addToWatchlist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { dealId, notes } = req.body;

      const item = await watchlistService.addToWatchlist(userId, dealId, notes);

      logger.info(`User ${userId} added deal ${dealId} to watchlist`);

      res.status(201).json({
        success: true,
        data: { item },
        message: 'Deal added to watchlist',
      });
    } catch (error) {
      next(error);
    }
  }

  async removeFromWatchlist(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const dealId = String(req.params.dealId);

      await watchlistService.removeFromWatchlist(userId, dealId);

      logger.info(`User ${userId} removed deal ${dealId} from watchlist`);

      res.status(200).json({
        success: true,
        message: 'Deal removed from watchlist',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateNotes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const dealId = String(req.params.dealId);
      const { notes } = req.body;

      const item = await watchlistService.updateNotes(userId, dealId, notes);

      res.status(200).json({
        success: true,
        data: { item },
        message: 'Notes updated',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new WatchlistController();
