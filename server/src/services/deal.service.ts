import { Deal, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

interface DealFilters {
  category?: string;
  marketplace?: string;
  minDealScore?: number;
  maxPrice?: number;
  search?: string;
  status?: string;
}

interface DealSortOptions {
  sortBy?: 'dealScore' | 'estimatedProfit' | 'createdAt' | 'price';
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
      marketplace,
      minDealScore,
      maxPrice,
      search,
      status = 'active',
    } = filters;

    const { sortBy = 'dealScore', sortOrder = 'desc' } = sort;
    const { page = 1, limit = 20 } = pagination;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.DealWhereInput = {
      status,
      ...(category && { category }),
      ...(marketplace && { marketplace }),
      ...(minDealScore && { dealScore: { gte: minDealScore } }),
      ...(maxPrice && { price: { lte: maxPrice } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
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

  async createDeal(data: Prisma.DealCreateInput): Promise<Deal> {
    // Check if deal with marketplace ID already exists
    if (data.marketplaceId) {
      const existing = await prisma.deal.findUnique({
        where: { marketplaceId: data.marketplaceId },
      });

      if (existing) {
        throw new AppError('Deal with this marketplace ID already exists', 400);
      }
    }

    const deal = await prisma.deal.create({
      data,
    });

    return deal;
  }

  async updateDeal(id: string, data: Prisma.DealUpdateInput): Promise<Deal> {
    const deal = await prisma.deal.update({
      where: { id },
      data,
    });

    return deal;
  }

  async deleteDeal(id: string): Promise<void> {
    await prisma.deal.delete({
      where: { id },
    });
  }

  async getCategories(): Promise<string[]> {
    const categories = await prisma.deal.findMany({
      where: { status: 'active' },
      select: { category: true },
      distinct: ['category'],
    });

    return categories.map((c) => c.category);
  }

  async getMarketplaces(): Promise<string[]> {
    const marketplaces = await prisma.deal.findMany({
      where: { status: 'active' },
      select: { marketplace: true },
      distinct: ['marketplace'],
    });

    return marketplaces.map((m) => m.marketplace);
  }

  async getDealStats() {
    const [totalDeals, avgDealScore, avgProfit, topCategories] = await Promise.all([
      prisma.deal.count({ where: { status: 'active' } }),
      prisma.deal.aggregate({
        where: { status: 'active' },
        _avg: { dealScore: true },
      }),
      prisma.deal.aggregate({
        where: { status: 'active' },
        _avg: { estimatedProfit: true },
      }),
      prisma.deal.groupBy({
        by: ['category'],
        where: { status: 'active' },
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      totalDeals,
      avgDealScore: avgDealScore._avg.dealScore || 0,
      avgProfit: avgProfit._avg.estimatedProfit || 0,
      topCategories: topCategories.map((c) => ({
        category: c.category,
        count: c._count.category,
      })),
    };
  }
}

export default new DealService();
