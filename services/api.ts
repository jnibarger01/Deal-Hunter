import { Deal, Marketplace, LocationTarget, Category } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export interface SearchParams {
  marketplace: 'ebay';
  query: string;
  locationId?: string;
  filters?: {
    minPrice?: number;
    maxPrice?: number;
  };
}

interface EbaySummary {
  itemId?: string;
  title?: string;
  price?: { value?: string };
  image?: { imageUrl?: string };
  itemLocation?: { city?: string; stateOrProvince?: string };
  itemCreationDate?: string;
  itemWebUrl?: string;
}

const formatRelativeTime = (dateString?: string) => {
  if (!dateString) return 'Recent';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Recent';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
};

const scoreDeal = (price: number, marketValue: number) => {
  if (!price) return 0;
  const margin = Math.max(0, marketValue - price);
  const ratio = margin / price;
  const raw = 60 + ratio * 40;
  return Math.max(40, Math.min(99, Math.round(raw)));
};

const toDeal = (item: EbaySummary): Deal => {
  const price = Number(item.price?.value || 0);
  const marketValue = price ? Math.round(price * 1.35) : 0;
  const estimatedProfit = Math.max(0, marketValue - price);
  const score = scoreDeal(price, marketValue);
  const locationParts = [item.itemLocation?.city, item.itemLocation?.stateOrProvince].filter(Boolean);

  return {
    id: item.itemId || crypto.randomUUID(),
    title: item.title || 'Untitled listing',
    price,
    marketValue,
    marketplace: Marketplace.EBAY,
    category: Category.TECH,
    imageUrl: item.image?.imageUrl || 'https://picsum.photos/seed/deal-hunter/600/400',
    location: locationParts.length ? locationParts.join(', ') : 'Ships nationwide',
    postedAt: formatRelativeTime(item.itemCreationDate),
    description: item.title || 'No description available.',
    dealScore: score,
    estimatedProfit,
    condition: 'Good',
    isWatched: false
  };
};

export const fetchLocations = async (): Promise<LocationTarget[]> => {
  const response = await fetch(`${API_BASE}/locations`);
  if (!response.ok) {
    throw new Error('Failed to load locations');
  }
  const payload = await response.json();
  return payload.items || [];
};

export const createLocation = async (input: {
  label?: string;
  city?: string;
  zip?: string;
  radiusMiles: number;
  filters?: {
    minPrice?: number;
    maxPrice?: number;
  };
}): Promise<LocationTarget> => {
  const response = await fetch(`${API_BASE}/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to create location');
  }
  return response.json();
};

export const searchDeals = async (params: SearchParams): Promise<Deal[]> => {
  const search = new URLSearchParams({
    marketplace: params.marketplace,
    query: params.query
  });

  if (params.locationId) {
    search.set('locationId', params.locationId);
  }
  if (params.filters) {
    search.set('filters', JSON.stringify(params.filters));
  }

  const response = await fetch(`${API_BASE}/search?${search.toString()}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Search failed');
  }
  const payload = await response.json();
  const items = (payload.items || []) as EbaySummary[];
  return items.map(toDeal);
};
