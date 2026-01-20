
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
  tmvDecision?: DecisionPayload;
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

export interface SoldListingInput {
  listingId: string;
  itemPrice: number;
  shippingCost: number;
  soldDate: string;
  rawCondition: string;
  title: string;
  category: string;
}

export interface MarketMetricsInput {
  activeListingsCount: number;
  avgDaysToSell: number;
  sellThroughRate: number;
  recentSalesCount30d: number;
}

export interface TMVResult {
  tmv: number | null;
  confidence: number;
  sampleSize: number;
  dataFreshnessDays: number;
  velocityScore: number;
  trend: string;
  trendRate: number;
  rawMedian: number | null;
  iqrFilteredMedian: number | null;
  timeWeightedMedian: number | null;
  outlierRemovalRatio: number;
  recencyDistribution: string;
  warnings: string[];
}

export interface ProfitAnalysis {
  purchasePrice: number;
  estimatedSalePrice: number;
  estimatedShipping: number;
  totalFees: number;
  netProfit: number;
  roiPercent: number;
  finalValueFee: number;
  paymentProcessingFee: number;
  fixedFees: number;
}

export interface DecisionPayload {
  tmv: TMVResult;
  profit: ProfitAnalysis;
  dealScore: number;
  recommendedAction: {
    action: 'buy_now' | 'good' | 'marginal' | 'skip';
    message: string;
  };
}
