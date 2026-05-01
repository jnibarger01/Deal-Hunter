import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/prisma';
import logger from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import tmvConfig, { TMVConfig } from '../config/tmv';
import config from '../config/env';
import { TMVCalculator } from '../domain/tmv';
import { DealScorer, FeeAssumptions } from '../domain/score';
import { EbayClient, LiveEbayDeal } from './ebay';

const GEMINI_TIMEOUT_MS = 5000;

const sourceFeeDefaults: Record<string, number> = {
  ebay: 13,
  'fb market': 5,
  'fb marketplace': 5,
  craigslist: 3,
  offerup: 8,
};

const decimalToNumber = (value: Decimal | null | undefined): number | null => {
  if (value == null) {
    return null;
  }

  return Number(value);
};

const toOptionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export interface TMVAssumptionsParams {
  category?: string;
  source?: string;
}

export interface CreateTMVScenarioInput {
  name: string;
  category?: string;
  source?: string;
  buyPrice: number;
  expectedSalePrice: number;
  shippingCost?: number;
  platformFeePct?: number;
  prepCost?: number;
  taxPct?: number;
  notes?: string;
}

export interface DealIntelligenceResult {
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

export class AnalyticsService {
  getDefaultPlatformFeeRate(source?: string): number {
    const normalizedSource = source?.toLowerCase().trim();
    const feePct = normalizedSource ? sourceFeeDefaults[normalizedSource] ?? 10 : 10;
    return feePct / 100;
  }

  async resolveTmvConfigForCategory(category: string | null | undefined): Promise<TMVConfig> {
    if (!category) {
      return tmvConfig;
    }

    const override = await prisma.categoryConfig.findUnique({
      where: { category },
    });

    if (!override) {
      return tmvConfig;
    }

    return {
      ...tmvConfig,
      minSamples: override.minSamples,
      freshnessWindow: override.freshnessWindow,
      decayRate: Number(override.decayRate),
    };
  }

  async calculateAndPersistTMV(dealId: string) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { samples: true },
    });

    if (!deal) {
      throw new AppError('Deal not found', 404);
    }

    // §7.2.3 grouping: samples attach to a specific deal with a single category,
    // so deal.samples is already category-aligned at the query level.
    const resolvedConfig = await this.resolveTmvConfigForCategory(deal.category);
    const calculator = new TMVCalculator(resolvedConfig);
    const result = calculator.calculate(deal.samples, {
      targetCondition: deal.condition,
      targetRegion: deal.region,
      targetTitle: deal.title,
      targetDescription: deal.description,
      targetCategory: deal.category,
    });

    if (!result) {
      throw new AppError('Insufficient data for TMV', 400);
    }

    const tmv = await prisma.tMVResult.upsert({
      where: { dealId },
      create: {
        dealId,
        tmv: result.tmv,
        confidence: result.confidence,
        sampleCount: result.sampleCount,
        volatility: result.volatility,
        liquidityScore: result.liquidityScore,
        estimatedDaysToSell: result.estimatedDaysToSell,
      },
      update: {
        tmv: result.tmv,
        confidence: result.confidence,
        sampleCount: result.sampleCount,
        volatility: result.volatility,
        liquidityScore: result.liquidityScore,
        estimatedDaysToSell: result.estimatedDaysToSell,
      },
    });

    return this.serializeTMVResult(tmv);
  }

  async getTMVResult(dealId: string) {
    const tmv = await prisma.tMVResult.findUnique({ where: { dealId } });

    if (!tmv) {
      throw new AppError('TMV result not found', 404);
    }

    return this.serializeTMVResult(tmv);
  }

  async calculateAndPersistScore(dealId: string, feeAssumptions: FeeAssumptions = {}) {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });

    if (!deal) {
      throw new AppError('Deal not found', 404);
    }

    const tmv = await prisma.tMVResult.findUnique({ where: { dealId } });
    if (!tmv) {
      throw new AppError('TMV must be calculated before scoring', 400);
    }

    const scorer = new DealScorer();
    const normalizedFeeAssumptions: FeeAssumptions = {
      platformFeeRate:
        feeAssumptions.platformFeeRate ?? this.getDefaultPlatformFeeRate(deal.source),
      shippingCost: feeAssumptions.shippingCost,
      fixedFees: feeAssumptions.fixedFees,
    };

    const scoreResult = scorer.calculateScore(
      {
        price: deal.price,
        category: deal.category,
      },
      {
        tmv: tmv.tmv,
        confidence: Number(tmv.confidence),
        volatility: tmv.volatility,
        liquidityScore: Number(tmv.liquidityScore),
      },
      normalizedFeeAssumptions
    );

    const score = await prisma.score.upsert({
      where: { dealId },
      create: {
        dealId,
        profitMargin: scoreResult.profitMargin,
        velocityScore: scoreResult.velocityScore,
        riskScore: scoreResult.riskScore,
        compositeRank: scoreResult.compositeRank,
      },
      update: {
        profitMargin: scoreResult.profitMargin,
        velocityScore: scoreResult.velocityScore,
        riskScore: scoreResult.riskScore,
        compositeRank: scoreResult.compositeRank,
        calculatedAt: new Date(),
      },
    });

    return {
      ...this.serializeScore(score),
      feesApplied: Number(scoreResult.feesApplied),
    };
  }

  async persistLiveEbayDeals(ebayClient: EbayClient, deals: LiveEbayDeal[]) {
    const persistedDeals = [] as LiveEbayDeal[];

    for (const deal of deals) {
      const persistedDeal = await prisma.deal.upsert({
        where: { source_sourceId: { source: 'ebay', sourceId: deal.sourceId } },
        create: {
          source: 'ebay',
          sourceId: deal.sourceId,
          title: deal.title,
          description: deal.description || undefined,
          imageUrl: deal.imageUrl || undefined,
          price: deal.price,
          condition: deal.condition,
          category: deal.category,
          location: deal.location,
          url: deal.url,
          marketplace: 'ebay',
          status: 'active',
        },
        update: {
          title: deal.title,
          description: deal.description || undefined,
          imageUrl: deal.imageUrl || undefined,
          price: deal.price,
          condition: deal.condition,
          category: deal.category,
          location: deal.location,
          url: deal.url,
          marketplace: 'ebay',
          status: 'active',
        },
      });

      const soldListings = await ebayClient.searchCompletedListings(deal.title, undefined, 90);

      if (soldListings.length > 0) {
        await prisma.marketSample.deleteMany({
          where: {
            dealId: persistedDeal.id,
            source: 'ebay',
          },
        });

        await prisma.marketSample.createMany({
          data: soldListings.map((sample) => ({
            dealId: persistedDeal.id,
            observedPrice: sample.soldPrice,
            observedAt: sample.soldDate,
            source: 'ebay',
            condition: sample.condition,
            status: 'sold',
            finalPrice: sample.soldPrice,
            soldAt: sample.soldDate,
            title: deal.title,
          })),
        });
      }

      try {
        await this.calculateAndPersistTMV(persistedDeal.id);
        await this.calculateAndPersistScore(persistedDeal.id);
      } catch (error) {
        if (!(error instanceof AppError) || error.statusCode >= 500) {
          throw error;
        }
        // Expected 4xx path (e.g. Browse API produces no sold comps → below 8-sample floor).
        // Log so operators can see why TMV/score is missing from persisted live deals.
        logger.warn('Live eBay deal persisted without TMV/score', {
          dealId: persistedDeal.id,
          sourceId: persistedDeal.sourceId,
          reason: error.message,
          statusCode: error.statusCode,
        });
      }

      persistedDeals.push({
        ...deal,
        id: persistedDeal.id,
        createdAt: persistedDeal.createdAt.toISOString(),
      });
    }

    return persistedDeals;
  }

  async getRankedDeals(limit = 50) {
    const ranked = await prisma.deal.findMany({
      where: {
        status: 'active',
        tmvResult: { isNot: null },
        score: { isNot: null },
      },
      include: {
        tmvResult: true,
        score: true,
      },
      orderBy: {
        score: {
          compositeRank: 'desc',
        },
      },
      take: limit,
    });

    return ranked.map((deal) => ({
      id: deal.id,
      source: deal.source,
      sourceId: deal.sourceId,
      title: deal.title,
      price: Number(deal.price),
      condition: deal.condition,
      category: deal.category,
      location: deal.location,
      url: deal.url,
      createdAt: deal.createdAt.toISOString(),
      tmv: deal.tmvResult ? this.serializeTMVResult(deal.tmvResult) : undefined,
      score: deal.score ? this.serializeScore(deal.score) : undefined,
    }));
  }

  async getTMVAssumptions(params: TMVAssumptionsParams = {}) {
    const category = params.category?.trim();
    const source = params.source?.trim();

    const deals = await prisma.deal.findMany({
      where: {
        status: 'active',
        ...(category ? { category } : {}),
        ...(source ? { source } : {}),
        tmvResult: { isNot: null },
      },
      include: {
        tmvResult: true,
        score: true,
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    const margins = deals
      .filter((deal) => Number(deal.price) > 0 && deal.tmvResult)
      .map((deal) => (Number(deal.tmvResult!.tmv) - Number(deal.price)) / Number(deal.price));
    const daysToSell = deals
      .filter((deal) => deal.tmvResult?.estimatedDaysToSell !== null && deal.tmvResult?.estimatedDaysToSell !== undefined)
      .map((deal) => Number(deal.tmvResult!.estimatedDaysToSell));
    const confidenceScores = deals
      .filter((deal) => deal.tmvResult)
      .map((deal) => Number(deal.tmvResult!.confidence));

    const average = (values: number[]) =>
      values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

    const defaultFeePct = this.getDefaultPlatformFeeRate(source) * 100;
    const markupPct = Math.max(0, average(margins) * 100);
    const recommendedFeePct = deals.length
      ? Math.max(defaultFeePct, Math.min(20, markupPct * 0.35))
      : defaultFeePct;
    const recommendedDaysToSell = daysToSell.length ? Math.max(1, Math.round(average(daysToSell))) : 7;
    const confidence = confidenceScores.length ? Math.max(0.4, Math.min(0.95, average(confidenceScores))) : 0.65;

    return {
      category: category || null,
      source: source || null,
      sampleSize: deals.length,
      recommendedMarkupPct: Number(markupPct.toFixed(2)),
      recommendedFeePct: Number(recommendedFeePct.toFixed(2)),
      recommendedDaysToSell,
      confidence: Number(confidence.toFixed(2)),
    };
  }

  async getDealIntelligence(dealId: string): Promise<DealIntelligenceResult> {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        tmvResult: true,
        score: true,
      },
    });

    if (!deal) {
      throw new AppError('Deal not found', 404);
    }

    const fallback = this.buildFallbackIntelligence(deal);

    if (!config.apiKeys.gemini) {
      return fallback;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    try {
      const prompt = this.buildDealIntelligencePrompt(deal);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.apiKeys.gemini}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        return fallback;
      }

      const payload = await response.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        return fallback;
      }

      return this.normalizeDealIntelligence(JSON.parse(text), fallback);
    } catch {
      return fallback;
    } finally {
      clearTimeout(timeout);
    }
  }

  async listTMVScenarios() {
    const scenarios = await prisma.tMVScenario.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return scenarios.map((scenario) => this.serializeScenario(scenario));
  }

  async createTMVScenario(input: CreateTMVScenarioInput) {
    const created = await prisma.tMVScenario.create({
      data: {
        name: String(input.name),
        category: toOptionalString(input.category),
        source: toOptionalString(input.source),
        buyPrice: toNumber(input.buyPrice),
        expectedSalePrice: toNumber(input.expectedSalePrice),
        shippingCost: toNumber(input.shippingCost),
        platformFeePct: toNumber(input.platformFeePct),
        prepCost: toNumber(input.prepCost),
        taxPct: toNumber(input.taxPct),
        notes: toOptionalString(input.notes),
      },
    });

    return this.serializeScenario(created);
  }

  async deleteTMVScenario(id: string) {
    await prisma.tMVScenario.delete({ where: { id } });
  }

  private buildFallbackIntelligence(deal: {
    title: string;
    price: Decimal;
    category: string;
    condition: string | null;
    source: string;
    location: string | null;
    tmvResult?: {
      tmv: Decimal;
    } | null;
    score?: {
      compositeRank: Decimal;
    } | null;
  }): DealIntelligenceResult {
    const price = Number(deal.price);
    const targetPrice = deal.tmvResult ? Number(deal.tmvResult.tmv) : Math.round(Math.max(price * 1.35, price + 100) / 25) * 25;
    const normalizedCondition = (deal.condition ?? '').toLowerCase();
    const needsRepair = normalizedCondition.includes('fair') || normalizedCondition.includes('parts') || normalizedCondition.includes('repair');
    const targetOffer = Math.round(price * 0.75 / 25) * 25;

    return {
      repairAnalysis: {
        skillLevel: needsRepair ? 'INTERMEDIATE' : 'BEGINNER',
        summary: needsRepair
          ? `This looks like a repair-and-resell play with upside if the fix stays cheap. The ask is below the working market target of $${targetPrice}, but margin depends on controlling parts and labor.`
          : `This listing reads like a clean flip rather than a repair project. At the current ask, there is room under the estimated market value of $${targetPrice} if condition matches the post.`,
        likelyIssue: needsRepair
          ? 'Condition notes imply cosmetic wear or a minor functional issue that should be verified before purchase.'
          : 'No obvious defect is called out in the listing details.',
        partsCost: needsRepair ? Math.round(Math.max(40, price * 0.12)) : 0,
      },
      marketDynamics: {
        summary: `The resale market for this ${deal.category} item is still active, but buyers are price sensitive. Clean listings in ${deal.condition ?? 'usable'} condition tend to move best when priced below $${targetPrice}.`,
        targetPrice,
        priceHistory: [
          Math.round(targetPrice * 1.08),
          Math.round(targetPrice * 1.04),
          Math.round(targetPrice * 1.01),
          Math.round(targetPrice * 0.97),
          Math.round(targetPrice * 0.95),
          targetPrice,
        ],
      },
      negotiation: {
        targetOffer,
        openingScript: `Hi there — I saw your ${deal.title} on ${deal.source}. If you're looking for a quick, easy sale${deal.location ? ` in ${deal.location}` : ''}, I can do $${targetOffer} today.`,
      },
    };
  }

  private buildDealIntelligencePrompt(deal: {
    title: string;
    price: Decimal;
    category: string;
    condition: string | null;
    source: string;
    location: string | null;
    tmvResult?: {
      tmv: Decimal;
      confidence: Decimal;
      sampleCount: number;
      volatility: Decimal;
      liquidityScore: Decimal;
      estimatedDaysToSell: number | null;
    } | null;
    score?: {
      compositeRank: Decimal;
      profitMargin: Decimal;
      velocityScore: Decimal;
      riskScore: Decimal;
    } | null;
  }) {
    return [
      'You are generating concise resale intelligence for a marketplace flipping dashboard.',
      'Return JSON only with this exact shape:',
      '{',
      '  "repairAnalysis": { "skillLevel": string, "summary": string, "likelyIssue": string, "partsCost": number },',
      '  "marketDynamics": { "summary": string, "targetPrice": number, "priceHistory": number[] },',
      '  "negotiation": { "targetOffer": number, "openingScript": string }',
      '}',
      'Rules:',
      '- skillLevel should be BEGINNER, INTERMEDIATE, or ADVANCED',
      '- priceHistory must have exactly 6 numbers',
      '- targetOffer must be a realistic negotiation anchor below list price',
      '- keep each summary to 2-3 sentences max',
      '',
      `title: ${deal.title}`,
      `price: ${Number(deal.price)}`,
      `category: ${deal.category}`,
      `condition: ${deal.condition ?? 'unknown'}`,
      `source: ${deal.source}`,
      `location: ${deal.location ?? 'unknown'}`,
      `tmv: ${deal.tmvResult ? Number(deal.tmvResult.tmv) : 'unknown'}`,
      `tmvConfidence: ${deal.tmvResult ? Number(deal.tmvResult.confidence) : 'unknown'}`,
      `tmvSampleCount: ${deal.tmvResult?.sampleCount ?? 'unknown'}`,
      `volatility: ${deal.tmvResult ? Number(deal.tmvResult.volatility) : 'unknown'}`,
      `liquidityScore: ${deal.tmvResult ? Number(deal.tmvResult.liquidityScore) : 'unknown'}`,
      `estimatedDaysToSell: ${deal.tmvResult?.estimatedDaysToSell ?? 'unknown'}`,
      `compositeRank: ${deal.score ? Number(deal.score.compositeRank) : 'unknown'}`,
      `profitMargin: ${deal.score ? Number(deal.score.profitMargin) : 'unknown'}`,
      `velocityScore: ${deal.score ? Number(deal.score.velocityScore) : 'unknown'}`,
      `riskScore: ${deal.score ? Number(deal.score.riskScore) : 'unknown'}`,
    ].join('\n');
  }

  private normalizeDealIntelligence(payload: unknown, fallback: DealIntelligenceResult): DealIntelligenceResult {
    if (!payload || typeof payload !== 'object') {
      return fallback;
    }

    const record = payload as Record<string, unknown>;
    const repair = record.repairAnalysis as Record<string, unknown> | undefined;
    const market = record.marketDynamics as Record<string, unknown> | undefined;
    const negotiation = record.negotiation as Record<string, unknown> | undefined;

    const normalizeHistory = (value: unknown): number[] => {
      const candidate = Array.isArray(value) && value.every((item) => typeof item === 'number')
        ? [...(value as number[])]
        : [...fallback.marketDynamics.priceHistory];

      if (candidate.length === 6) {
        return candidate;
      }

      if (candidate.length > 6) {
        return candidate.slice(0, 6);
      }

      while (candidate.length < 6) {
        candidate.push(candidate[candidate.length - 1] ?? fallback.marketDynamics.targetPrice);
      }

      return candidate;
    };

    return {
      repairAnalysis: {
        skillLevel: typeof repair?.skillLevel === 'string' ? repair.skillLevel : fallback.repairAnalysis.skillLevel,
        summary: typeof repair?.summary === 'string' ? repair.summary : fallback.repairAnalysis.summary,
        likelyIssue: typeof repair?.likelyIssue === 'string' ? repair.likelyIssue : fallback.repairAnalysis.likelyIssue,
        partsCost: typeof repair?.partsCost === 'number' ? repair.partsCost : fallback.repairAnalysis.partsCost,
      },
      marketDynamics: {
        summary: typeof market?.summary === 'string' ? market.summary : fallback.marketDynamics.summary,
        targetPrice: typeof market?.targetPrice === 'number' ? market.targetPrice : fallback.marketDynamics.targetPrice,
        priceHistory: normalizeHistory(market?.priceHistory),
      },
      negotiation: {
        targetOffer: typeof negotiation?.targetOffer === 'number' ? negotiation.targetOffer : fallback.negotiation.targetOffer,
        openingScript: typeof negotiation?.openingScript === 'string' ? negotiation.openingScript : fallback.negotiation.openingScript,
      },
    };
  }

  private serializeTMVResult(tmv: {
    dealId: string;
    tmv: Decimal;
    confidence: Decimal;
    sampleCount: number;
    volatility: Decimal;
    liquidityScore: Decimal;
    estimatedDaysToSell: number | null;
    calculatedAt: Date;
  }) {
    return {
      dealId: tmv.dealId,
      tmv: decimalToNumber(tmv.tmv),
      confidence: decimalToNumber(tmv.confidence),
      sampleCount: tmv.sampleCount,
      volatility: decimalToNumber(tmv.volatility),
      liquidityScore: decimalToNumber(tmv.liquidityScore),
      estimatedDaysToSell: tmv.estimatedDaysToSell,
      calculatedAt: tmv.calculatedAt.toISOString(),
    };
  }

  private serializeScore(score: {
    dealId: string;
    profitMargin: Decimal;
    velocityScore: Decimal;
    riskScore: Decimal;
    compositeRank: Decimal;
    calculatedAt: Date;
  }) {
    return {
      dealId: score.dealId,
      profitMargin: decimalToNumber(score.profitMargin),
      velocityScore: decimalToNumber(score.velocityScore),
      riskScore: decimalToNumber(score.riskScore),
      compositeRank: decimalToNumber(score.compositeRank),
      calculatedAt: score.calculatedAt.toISOString(),
    };
  }

  private serializeScenario(scenario: Prisma.TMVScenarioGetPayload<Record<string, never>>) {
    return {
      ...scenario,
      buyPrice: Number(scenario.buyPrice),
      expectedSalePrice: Number(scenario.expectedSalePrice),
      shippingCost: Number(scenario.shippingCost),
      platformFeePct: Number(scenario.platformFeePct),
      prepCost: Number(scenario.prepCost),
      taxPct: Number(scenario.taxPct),
      createdAt: scenario.createdAt.toISOString(),
      updatedAt: scenario.updatedAt.toISOString(),
    };
  }
}

export default new AnalyticsService();
