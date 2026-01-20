
export enum Marketplace {
  CRAIGSLIST = 'Craigslist',
  EBAY = 'eBay',
  FACEBOOK = 'FB Marketplace'
}

export enum Category {
  AUTOMOTIVE = 'Automotive',
  TECH = 'Tech & Electronics',
  TVS = 'TVs & Speakers',
  TOOLS = 'Tools',
  GAMING = 'Gaming'
}

export interface Deal {
  id: string;
  title: string;
  price: number;
  marketValue: number;
  marketplace: Marketplace;
  category: Category;
  imageUrl: string;
  location: string;
  postedAt: string;
  description: string;
  dealScore: number;
  estimatedProfit: number;
  condition: 'Poor' | 'Fair' | 'Good' | 'Excellent' | 'New';
  isWatched?: boolean;
}

export interface RepairInsight {
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  likelyIssue: string;
  partsCostEst: string;
  resalePotential: string;
  summary: string;
}

export interface NegotiationScript {
  approach: string;
  opening: string;
  lowballBuffer: string;
  closing: string;
  suggestedOffer: number;
}

export interface LocationTarget {
  id: string;
  label: string;
  city: string | null;
  zip: string | null;
  lat: number;
  lng: number;
  radiusMiles: number;
  filters: {
    categories?: string[];
    minPrice?: number;
    maxPrice?: number;
    condition?: string[];
  };
}
