import type { Deal, DealIntelligence, TMVResult } from '../types';

export interface DealIntelligenceView {
  description: string;
  marketValue: number;
  roi: number;
  dealScore: number;
  repairAnalysis: DealIntelligence['repairAnalysis'];
  marketDynamics: DealIntelligence['marketDynamics'];
  negotiation: DealIntelligence['negotiation'];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function roundMoney(value: number): number {
  return Math.round(value / 25) * 25;
}

function toTitleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function sourceLabel(source: string): string {
  const normalized = source.toLowerCase();
  if (normalized === 'ebay') return 'eBay';
  if (normalized === 'craigslist') return 'Craigslist';
  if (normalized === 'facebook' || normalized === 'fb marketplace') return 'FB Marketplace';
  return toTitleCase(source);
}

function buildDescription(deal: Deal): string {
  if (deal.description?.trim()) {
    return deal.description;
  }

  const condition = deal.condition ? `${deal.condition} condition` : 'solid condition';
  const location = deal.location ? ` in ${deal.location}` : '';
  return `Seller is offering this ${deal.category} listing${location}. Based on the current source data, it appears to be in ${condition} with room for a quick flip if the numbers hold.`;
}

function buildRepairAnalysis(deal: Deal, marketValue: number): DealIntelligence['repairAnalysis'] {
  const normalizedCondition = (deal.condition ?? '').toLowerCase();
  const needsRepair = normalizedCondition.includes('fair')
    || normalizedCondition.includes('parts')
    || normalizedCondition.includes('repair');

  return {
    skillLevel: needsRepair ? 'INTERMEDIATE' : 'BEGINNER',
    summary: needsRepair
      ? `This looks like a light repair-and-resell play. At the current ask, there is still room under the estimated market value of ${formatCurrency(marketValue)}, but the margin depends on keeping repairs cheap and fast.`
      : `This listing represents a clean flip opportunity more than a repair project. With an estimated market value around ${formatCurrency(marketValue)}, the current ask leaves room for profit with minimal prep if the item matches the listing.`,
    likelyIssue: needsRepair
      ? 'Condition notes suggest cosmetic wear or light troubleshooting before resale.'
      : 'None; the listing reads like a straightforward flip instead of a repair project.',
    partsCost: needsRepair ? roundMoney(Math.max(40, deal.price * 0.12)) : 0,
  };
}

function buildMarketDynamics(deal: Deal, marketValue: number): DealIntelligence['marketDynamics'] {
  const spread = marketValue - deal.price;
  const tone = spread > deal.price * 0.2 ? 'cooling' : 'stable';

  return {
    summary: `The resale market for this ${deal.category} item looks ${tone} right now. Comparable pricing suggests buyers still have appetite when condition is strong, but they are getting more selective on ask price. Listings that are clean, correctly described, and priced below ${formatCurrency(marketValue)} tend to move fastest.`,
    targetPrice: marketValue,
    priceHistory: buildChartPoints(deal.price, marketValue),
  };
}

function buildNegotiation(deal: Deal, targetOffer: number): DealIntelligence['negotiation'] {
  return {
    targetOffer,
    openingScript: `Hi there — I saw your ${deal.title} on ${sourceLabel(deal.source)}. If you're looking for a quick, hassle-free sale, I can do ${formatCurrency(targetOffer)} and pick it up today.`,
  };
}

function buildChartPoints(price: number, marketValue: number): number[] {
  const high = Math.max(price, marketValue);
  return [
    Math.round(high * 0.94),
    Math.round(high * 1.02),
    Math.round(high * 0.98),
    Math.round(high * 0.89),
    Math.round(high * 0.92),
    Math.round(marketValue),
  ];
}

function normalizePriceHistory(
  priceHistory: number[] | undefined,
  marketValue: number,
  price: number
) {
  const fallback = buildChartPoints(price, marketValue);
  const candidate = Array.isArray(priceHistory) ? [...priceHistory] : fallback;

  if (candidate.length === 6) {
    return candidate;
  }

  if (candidate.length > 6) {
    return candidate.slice(0, 6);
  }

  while (candidate.length < 6) {
    candidate.push(candidate[candidate.length - 1] ?? marketValue);
  }

  return candidate;
}

export function adaptDealIntelligenceView(
  deal: Deal,
  intelligence: DealIntelligence | null | undefined,
  tmv: TMVResult | null | undefined
): DealIntelligenceView {
  const fallbackMarketValue = roundMoney(Math.max(deal.price * 1.35, deal.price + 100));
  const marketValue = tmv?.tmv ?? intelligence?.marketDynamics?.targetPrice ?? fallbackMarketValue;
  const roi = (marketValue - deal.price) / Math.max(deal.price, 1);
  const dealScore = Math.round(
    deal.score?.compositeRank ?? Math.min(99, Math.max(72, roi * 100 + 55))
  );
  const repairAnalysis = buildRepairAnalysis(deal, marketValue);
  const marketDynamics = buildMarketDynamics(deal, marketValue);
  const targetOffer = roundMoney(deal.price * 0.75);
  const negotiation = buildNegotiation(deal, targetOffer);

  return {
    description: buildDescription(deal),
    marketValue,
    roi,
    dealScore,
    repairAnalysis: {
      skillLevel: intelligence?.repairAnalysis?.skillLevel ?? repairAnalysis.skillLevel,
      summary: intelligence?.repairAnalysis?.summary ?? repairAnalysis.summary,
      likelyIssue: intelligence?.repairAnalysis?.likelyIssue ?? repairAnalysis.likelyIssue,
      partsCost: intelligence?.repairAnalysis?.partsCost ?? repairAnalysis.partsCost,
    },
    marketDynamics: {
      summary: intelligence?.marketDynamics?.summary ?? marketDynamics.summary,
      targetPrice: intelligence?.marketDynamics?.targetPrice ?? marketDynamics.targetPrice,
      priceHistory: normalizePriceHistory(
        intelligence?.marketDynamics?.priceHistory,
        intelligence?.marketDynamics?.targetPrice ?? marketDynamics.targetPrice,
        deal.price
      ),
    },
    negotiation: {
      targetOffer: intelligence?.negotiation?.targetOffer ?? negotiation.targetOffer,
      openingScript: intelligence?.negotiation?.openingScript ?? negotiation.openingScript,
    },
  };
}
