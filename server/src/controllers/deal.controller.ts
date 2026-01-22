import { Request, Response, NextFunction } from 'express';
import dealService from '../services/deal.service';
import { EbayService } from '../services/ebay.service';
import { LocationService } from '../services/location.service';
import logger from '../config/logger';

export class DealController {
  async searchDeals(req: Request, res: Response, next: NextFunction) {
    try {
      const { query, locationId, filters, radius } = req.query;

      let loc = undefined;
      if (locationId && typeof locationId === 'string') {
        const found = LocationService.getById(locationId);
        if (found) {
          loc = { postalCode: found.zip || undefined };
        }
      }

      let parsedFilters = undefined;
      if (filters && typeof filters === 'string') {
        try { parsedFilters = JSON.parse(filters); } catch { }
      }

      const results = await EbayService.search({
        query: req.query.query as string,
        location: loc,
        radiusMiles: req.query.radius ? Number(req.query.radius) : undefined,
        filters: parsedFilters
      });

      res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllDeals(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        category: req.query.category as string,
        marketplace: req.query.marketplace as string,
        minDealScore: req.query.minDealScore ? parseFloat(req.query.minDealScore as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
        search: req.query.search as string,
        status: req.query.status as string,
      };

      const sort = {
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const pagination = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      };

      const result = await dealService.getAllDeals(filters, sort, pagination);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getDealById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deal = await dealService.getDealById(id);

      res.status(200).json({
        success: true,
        data: { deal },
      });
    } catch (error) {
      next(error);
    }
  }

  async createDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const deal = await dealService.createDeal(req.body);

      logger.info(`Deal created: ${deal.id}`);

      res.status(201).json({
        success: true,
        data: { deal },
        message: 'Deal created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deal = await dealService.updateDeal(id, req.body);

      logger.info(`Deal updated: ${id}`);

      res.status(200).json({
        success: true,
        data: { deal },
        message: 'Deal updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await dealService.deleteDeal(id);

      logger.info(`Deal deleted: ${id}`);

      res.status(200).json({
        success: true,
        message: 'Deal deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await dealService.getCategories();

      res.status(200).json({
        success: true,
        data: { categories },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMarketplaces(req: Request, res: Response, next: NextFunction) {
    try {
      const marketplaces = await dealService.getMarketplaces();

      res.status(200).json({
        success: true,
        data: { marketplaces },
      });
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await dealService.getDealStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new DealController();
