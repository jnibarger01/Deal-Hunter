import { api } from '../api/client';
import type { LiveEbayDeal } from '../types';

export const liveEbayDealsTypeContract: Promise<LiveEbayDeal[]> = api.getLiveEbayDeals();
