// Core domain types aligned with PRD data model

export type LiveEbayCategory = 'automotive' | 'gaming' | 'tech' | 'tvs' | 'speakers' | 'tools';

export interface Deal {
  id: string;
  source: string;
  sourceId: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  price: number;
  condition: string | null;
  category: string;
  location: string | null;
  url: string | null;
  createdAt: string;
  tmv?: TMVResult;
  score?: Score;
}

export interface LiveEbayDeal extends Deal {
  source: 'ebay';
  description: string;
  imageUrl: string;
  condition: string;
  category: LiveEbayCategory;
  location: string;
  url: string;
}

export interface MarketSample {
  id: string;
  dealId: string;
  observedPrice: number;
  observedAt: string;
  source: string;
}

export interface TMVResult {
  dealId: string;
  tmv: number;
  confidence: number;
  sampleCount: number;
  volatility: number;
  liquidityScore: number;
  estimatedDaysToSell: number;
  calculatedAt: string;
}

export interface Score {
  dealId: string;
  profitMargin: number;
  velocityScore: number;
  riskScore: number;
  compositeRank: number;
  feesApplied?: number;
  calculatedAt?: string;
}

export interface RankedDeal extends Deal {
  tmv: TMVResult;
  score: Score;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  environment?: string;
}

export interface TMVAssumptions {
  category: string | null;
  source: string | null;
  sampleSize: number;
  recommendedMarkupPct: number;
  recommendedFeePct: number;
  recommendedDaysToSell: number;
  confidence: number;
}

export interface TMVScenario {
  id: string;
  name: string;
  category?: string | null;
  source?: string | null;
  buyPrice: number;
  expectedSalePrice: number;
  shippingCost: number;
  platformFeePct: number;
  prepCost: number;
  taxPct: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealIntelligence {
  repairAnalysis: {
    skillLevel: string;
    summary: string;
    likelyIssue: string;
    partsCost: number;
  };
  marketDynamics: {
    summary: string;
    targetPrice: number;
    priceHistory: number[];
  };
  negotiation: {
    targetOffer: number;
    openingScript: string;
  };
}

export interface IngestSourceRecord {
  id: string;
  kind: string;
  enabled: boolean;
  lastRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
  config: {
    rssUrl?: string;
    lastAcceptedCount?: number;
    lastFetchedCount?: number;
    lastRejectedCount?: number;
    lastError?: string | null;
  };
}

export interface ConnectionsData {
  ebay: {
    status: 'configured' | 'missing_credentials';
    lastLivePullAt: string | null;
  };
  craigslist: {
    schedulerEnabled: boolean;
    sources: IngestSourceRecord[];
  };
  facebook: {
    status: 'configured' | 'not_configured';
    profileName: string | null;
    lastTestedAt: string | null;
  };
}

// UI State types
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: keyof Deal | keyof Score | keyof TMVResult | 'compositeRank';
  direction: SortDirection;
}

export interface FilterConfig {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minProfit?: number;
  condition?: string;
  source?: string;
}

// Risk levels for visual indicators
export type RiskLevel = 'low' | 'medium' | 'high';
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient';

export function getRiskLevel(riskScore: number): RiskLevel {
  if (riskScore <= 0.3) return 'low';
  if (riskScore <= 0.6) return 'medium';
  return 'high';
}

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence < 0.4) return 'insufficient';
  if (confidence < 0.6) return 'low';
  if (confidence < 0.8) return 'medium';
  return 'high';
}
