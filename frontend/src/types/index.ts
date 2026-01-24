// Core domain types aligned with PRD data model

export interface Deal {
  id: string;
  source: string;
  sourceId: string;
  title: string;
  price: number;
  condition: string;
  category: string;
  location: string;
  url: string;
  createdAt: string;
  tmv?: TMVResult;
  score?: Score;
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
}

export interface RankedDeal extends Deal {
  tmv: TMVResult;
  score: Score;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
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
