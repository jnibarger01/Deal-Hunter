import { Request, Response, NextFunction } from 'express';
import { Deal, ListingStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import dealService from '../services/deal.service';

type DecimalField = Decimal | null | undefined;
type DealSortOptions = {
  sortBy?: 'createdAt' | 'price';
  sortOrder?: 'asc' | 'desc';
};

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
});

const parseNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseInteger = (value: unknown): number | undefined => {
  const parsed = parseNumber(value);
  if (parsed === undefined) {
    return undefined;
  }
  return Number.isInteger(parsed) ? parsed : undefined;
};

const allowedSortBy = new Set(['createdAt', 'price']);
const allowedSortOrder = new Set(['asc', 'desc']);
const allowedStatuses = new Set<ListingStatus>(['active', 'sold', 'expired']);

export class DealController {
  async getAllDeals(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        category: req.query.category as string,
        source: req.query.source as string,
        minDealScore: parseNumber(req.query.minDealScore),
        maxPrice: parseNumber(req.query.maxPrice),
        search: req.query.search as string,
        status: allowedStatuses.has(req.query.status as ListingStatus)
          ? (req.query.status as ListingStatus)
          : undefined,
      };

      const sortBy = req.query.sortBy as string | undefined;
      const sortOrder = req.query.sortOrder as string | undefined;

      const sort: DealSortOptions = {
        sortBy: sortBy && allowedSortBy.has(sortBy) ? (sortBy as DealSortOptions['sortBy']) : undefined,
        sortOrder: sortOrder && allowedSortOrder.has(sortOrder)
          ? (sortOrder as DealSortOptions['sortOrder'])
          : undefined,
      };

      const pagination = {
        page: parseInteger(req.query.page),
        limit: parseInteger(req.query.limit),
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

}

export default new DealController();
