import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { TMVCalculator } from '../domain/tmv';
import tmvConfig from '../config/tmv';
import { DealScorer } from '../domain/score';
import { analyzeDeal } from '../services/gemini';
import { validate } from '../middleware/validation';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

const scoreValidation = [
  body('dealId').isString().notEmpty(),
  body('feeAssumptions').optional().isObject(),
  body('feeAssumptions.platformFeeRate').optional().isFloat({ min: 0, max: 1 }),
  body('feeAssumptions.shippingCost').optional().isFloat({ min: 0 }),
  body('feeAssumptions.fixedFees').optional().isFloat({ min: 0 }),
];

const calculateValidation = [body('dealId').isString().notEmpty()];
const dealIdValidation = [param('dealId').isString().notEmpty()];
const rankedValidation = [query('limit').optional().isInt({ min: 1, max: 100 }).toInt()];

const decimalToNumber = (value: Decimal | null | undefined): number | null => {
  if (value == null) {
    return null;
  }
  return Number(value);
};

router.post(
  '/tmv/calculate',
  validate(calculateValidation),
  asyncHandler(async (req, res) => {
    const dealId = String(req.body.dealId);

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { samples: true },
    });

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    const calculator = new TMVCalculator(tmvConfig);
    const result = calculator.calculate(deal.samples, {
      targetCondition: deal.condition,
      targetRegion: deal.region,
      targetTitle: deal.title,
      targetDescription: deal.description,
      targetCategory: deal.category,
    });

    if (!result) {
      res.status(400).json({ error: 'Insufficient data for TMV' });
      return;
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

    res.status(200).json({
      dealId: tmv.dealId,
      tmv: decimalToNumber(tmv.tmv),
      confidence: decimalToNumber(tmv.confidence),
      sampleCount: tmv.sampleCount,
      volatility: decimalToNumber(tmv.volatility),
      liquidityScore: decimalToNumber(tmv.liquidityScore),
      estimatedDaysToSell: tmv.estimatedDaysToSell,
      calculatedAt: tmv.calculatedAt,
    });
  })
);

router.get(
  '/tmv/:dealId',
  validate(dealIdValidation),
  asyncHandler(async (req, res) => {
    const dealId = String(req.params.dealId);

    const tmv = await prisma.tMVResult.findUnique({
      where: { dealId },
    });

    if (!tmv) {
      res.status(404).json({ error: 'TMV result not found' });
      return;
    }

    res.status(200).json({
      dealId: tmv.dealId,
      tmv: decimalToNumber(tmv.tmv),
      confidence: decimalToNumber(tmv.confidence),
      sampleCount: tmv.sampleCount,
      volatility: decimalToNumber(tmv.volatility),
      liquidityScore: decimalToNumber(tmv.liquidityScore),
      estimatedDaysToSell: tmv.estimatedDaysToSell,
      calculatedAt: tmv.calculatedAt,
    });
  })
);

router.post(
  '/score',
  validate(scoreValidation),
  asyncHandler(async (req, res) => {
    const dealId = String(req.body.dealId);
    const feeAssumptions = req.body.feeAssumptions ?? {};

    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    const tmv = await prisma.tMVResult.findUnique({ where: { dealId } });
    if (!tmv) {
      res.status(400).json({ error: 'TMV must be calculated before scoring' });
      return;
    }

    const scorer = new DealScorer();
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
      feeAssumptions
    );

    const score = await prisma.score.upsert({
      where: { dealId },
      create: {
        dealId,
        profitMargin: scoreResult.profitMargin,
        velocityScore: scoreResult.velocityScore,
        riskScore: scoreResult.riskScore,
        compositeRank: scoreResult.compositeRank,
        feesApplied: scoreResult.feesApplied,
      },
      update: {
        profitMargin: scoreResult.profitMargin,
        velocityScore: scoreResult.velocityScore,
        riskScore: scoreResult.riskScore,
        compositeRank: scoreResult.compositeRank,
        feesApplied: scoreResult.feesApplied,
      },
    });

    res.status(200).json({
      dealId: score.dealId,
      profitMargin: decimalToNumber(score.profitMargin),
      velocityScore: decimalToNumber(score.velocityScore),
      riskScore: decimalToNumber(score.riskScore),
      compositeRank: decimalToNumber(score.compositeRank),
      feesApplied: decimalToNumber(score.feesApplied),
      calculatedAt: score.calculatedAt,
    });
  })
);

router.get(
  '/ranked',
  validate(rankedValidation),
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit ?? 50);

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

    const payload = ranked.map((deal) => ({
      id: deal.id,
      source: deal.source,
      sourceId: deal.sourceId,
      title: deal.title,
      price: decimalToNumber(deal.price),
      condition: deal.condition,
      category: deal.category,
      location: deal.location,
      url: deal.url,
      createdAt: deal.createdAt,
      tmv: deal.tmvResult
        ? {
            dealId: deal.tmvResult.dealId,
            tmv: decimalToNumber(deal.tmvResult.tmv),
            confidence: decimalToNumber(deal.tmvResult.confidence),
            sampleCount: deal.tmvResult.sampleCount,
            volatility: decimalToNumber(deal.tmvResult.volatility),
            liquidityScore: decimalToNumber(deal.tmvResult.liquidityScore),
            estimatedDaysToSell: deal.tmvResult.estimatedDaysToSell,
            calculatedAt: deal.tmvResult.calculatedAt,
          }
        : undefined,
      score: deal.score
        ? {
            dealId: deal.score.dealId,
            profitMargin: decimalToNumber(deal.score.profitMargin),
            velocityScore: decimalToNumber(deal.score.velocityScore),
            riskScore: decimalToNumber(deal.score.riskScore),
            compositeRank: decimalToNumber(deal.score.compositeRank),
            feesApplied: decimalToNumber(deal.score.feesApplied),
            calculatedAt: deal.score.calculatedAt,
          }
        : undefined,
    }));

    res.status(200).json(payload);
  })
);

const analyzeValidation = [param('dealId').isString().notEmpty()];

router.get(
  '/analyze/:dealId',
  validate(analyzeValidation),
  asyncHandler(async (req, res) => {
    const dealId = String(req.params.dealId);

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { tmvResult: true, score: true },
    });

    if (!deal) {
      res.status(404).json({ error: 'Deal not found' });
      return;
    }

    const analysis = await analyzeDeal({
      title: deal.title,
      price: Number(deal.price),
      condition: deal.condition,
      category: deal.category,
      location: deal.location,
      tmv: deal.tmvResult ? Number(deal.tmvResult.tmv) : null,
      confidence: deal.tmvResult ? Number(deal.tmvResult.confidence) : null,
      profitMargin: deal.score ? Number(deal.score.profitMargin) : null,
      compositeRank: deal.score ? Number(deal.score.compositeRank) : null,
    });

    res.status(200).json({ dealId, ...analysis });
  })
);

export default router;
