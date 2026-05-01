import { WatchlistItem } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class WatchlistService {
  async getWatchlist(userId: string) {
    const items = await prisma.watchlistItem.findMany({
      where: { userId },
      include: {
        deal: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return items;
  }

  async addToWatchlist(userId: string, dealId: string, notes?: string): Promise<WatchlistItem> {
    // Check if deal exists
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) {
      throw new AppError('Deal not found', 404);
    }

    // Check if already in watchlist
    const existing = await prisma.watchlistItem.findUnique({
      where: {
        userId_dealId: { userId, dealId },
      },
    });

    if (existing) {
      throw new AppError('Deal already in watchlist', 400);
    }

    const item = await prisma.watchlistItem.create({
      data: {
        userId,
        dealId,
        notes,
      },
      include: {
        deal: true,
      },
    });

    return item;
  }

  async removeFromWatchlist(userId: string, dealId: string): Promise<void> {
    const item = await prisma.watchlistItem.findUnique({
      where: {
        userId_dealId: { userId, dealId },
      },
    });

    if (!item) {
      throw new AppError('Watchlist item not found', 404);
    }

    await prisma.watchlistItem.delete({
      where: {
        userId_dealId: { userId, dealId },
      },
    });
  }

  async updateNotes(userId: string, dealId: string, notes: string): Promise<WatchlistItem> {
    const item = await prisma.watchlistItem.update({
      where: {
        userId_dealId: { userId, dealId },
      },
      data: { notes },
      include: {
        deal: true,
      },
    });

    return item;
  }
}

export default new WatchlistService();
