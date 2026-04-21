import { Deal, ListingStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

interface DealFilters {
  category?: string;
  source?: string;
  minDealScore?: number;
  maxPrice?: number;
  search?: string;
  status?: ListingStatus;
}

interface DealSortOptions {
  sortBy?: 'createdAt' | 'price';
  sortOrder?: 'asc' | 'desc';
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

export class DealService {
  async getAllDeals(
    filters: DealFilters = {},
    sort: DealSortOptions = {},
    pagination: PaginationOptions = {}
  ) {
    const {
      category,
      source,
      minDealScore,
      maxPrice,
      search,
      status = 'active',
    } = filters;

    const { sortBy = 'createdAt', sortOrder = 'desc' } = sort;
    const { page = 1, limit = 20 } = pagination;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.DealWhereInput = {
      status,
      ...(category && { category }),
      ...(source && { source }),
      ...(minDealScore !== undefined && minDealScore !== null && {
        score: {
          compositeRank: { gte: minDealScore },
        },
      }),
      ...(maxPrice !== undefined && maxPrice !== null && { price: { lte: maxPrice } }),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
        ],
      }),
    };

    // Get total count
    const total = await prisma.deal.count({ where });

    // Get deals
    const deals = await prisma.deal.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    return {
      deals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDealById(id: string): Promise<Deal> {
    const deal = await prisma.deal.findUnique({
      where: { id },
    });

    if (!deal) {
      throw new AppError('Deal not found', 404);
    }

    return deal;
  }
}

export default new DealService();
