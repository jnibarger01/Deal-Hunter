import { Request, Response, NextFunction } from 'express';
import { Deal } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import dealService from '../services/deal.service';
import logger from '../config/logger';

type DecimalField = Decimal | null | undefined;

const toNumberOrNull = (value: DecimalField): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return Number(value);
};

type DealWithDecimalFields = Deal & Record<string, unknown>;

const normalizeDeal = (deal: DealWithDecimalFields) => ({
  ...deal,
  price: toNumberOrNull(deal.price as DecimalField),
  marketValue: toNumberOrNull(deal.marketValue as DecimalField),
  estimatedProfit: toNumberOrNull(deal.estimatedProfit as DecimalField),
  dealScore: toNumberOrNull(deal.dealScore as DecimalField),
  roi: toNumberOrNull(deal.roi as DecimalField),
});

export class DealController {
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
      const normalizedDeals = result.deals.map(normalizeDeal);

      res.status(200).json({
        success: true,
        data: {
          ...result,
          deals: normalizedDeals,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getDealById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const deal = await dealService.getDealById(id);

      res.status(200).json({
        success: true,
        data: { deal: normalizeDeal(deal) },
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
        data: { deal: normalizeDeal(deal) },
        message: 'Deal created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
      const deal = await dealService.updateDeal(id, req.body);

      logger.info(`Deal updated: ${id}`);

      res.status(200).json({
        success: true,
        data: { deal: normalizeDeal(deal) },
        message: 'Deal updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteDeal(req: Request, res: Response, next: NextFunction) {
    try {
      const id = String(req.params.id);
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
