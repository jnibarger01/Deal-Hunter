import {
  DealScorer,
  MarketMetrics,
  MarketMetricsInput,
  ProfitCalculator,
  SoldListing,
  SoldListingInput,
  TMVEngine,
  TMVResult,
  parseConditionFilter,
} from './tmv-engine';

export interface TMVRequest {
  category: string;
  listingPrice: number;
  soldListings: SoldListingInput[];
  conditionFilter?: string;
  marketMetrics?: MarketMetricsInput;
  maxAgeDays?: number;
  shippingPolicy?: {
    buyerShippingCharged?: number;
    shippingLabelCost?: number;
  };
}

export interface DecisionPayload {
  tmv: TMVResult;
  profit: ReturnType<typeof ProfitCalculator.calculate>;
  dealScore: number;
  recommendedAction: {
    action: 'buy_now' | 'good' | 'marginal' | 'skip';
    message: string;
  };
}

const toMarketMetrics = (input?: MarketMetricsInput): MarketMetrics | null => {
  if (!input) {
    return null;
  }
  return {
    activeListingsCount: Number(input.activeListingsCount),
    avgDaysToSell: Number(input.avgDaysToSell),
    sellThroughRate: Number(input.sellThroughRate),
    recentSalesCount30d: Number(input.recentSalesCount30d),
  };
};

const toSoldListings = (inputs: SoldListingInput[]): SoldListing[] => {
  return inputs
    .map((input) => TMVEngine.parseListing(input))
    .filter((listing): listing is SoldListing => listing !== null);
};

const recommendAction = (dealScore: number) => {
  if (dealScore >= 80) {
    return { action: 'buy_now', message: 'Excellent deal based on current TMV.' };
  }
  if (dealScore >= 60) {
    return { action: 'good', message: 'Solid opportunity with acceptable risk.' };
  }
  if (dealScore >= 40) {
    return { action: 'marginal', message: 'Risky; consider only with clear upside.' };
  }
  return { action: 'skip', message: 'Low margin or weak signal; skip.' };
};

export class TMVService {
  computeDecisionPayload(input: TMVRequest): DecisionPayload {
    const listings = toSoldListings(input.soldListings);
    const engine = new TMVEngine(input.category);
    const conditionFilter = parseConditionFilter(input.conditionFilter);
    const tmv = engine.calculate(listings, {
      conditionFilter,
      marketMetrics: toMarketMetrics(input.marketMetrics),
      maxAgeDays: input.maxAgeDays,
    });

    const profit = ProfitCalculator.calculate({
      purchasePrice: input.listingPrice,
      salePrice: tmv.tmv ?? 0,
      category: input.category,
      buyerShippingCharged: input.shippingPolicy?.buyerShippingCharged ?? 0,
      shippingLabelCost: input.shippingPolicy?.shippingLabelCost ?? 0,
    });

    const dealScore = DealScorer.score(input.listingPrice, tmv, profit);
    const recommendedAction = recommendAction(dealScore);

    return {
      tmv,
      profit,
      dealScore,
      recommendedAction,
    };
  }
}

export default new TMVService();
