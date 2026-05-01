import request from 'supertest';
import app from '../../src/app';
import config from '../../src/config/env';
import { prisma } from '../setup';

describe('Deals extra routes', () => {
  let dealId: string;
  const originalOperatorIngestToken = config.operatorIngestToken;

  beforeEach(async () => {
    config.operatorIngestToken = 'operator-secret';

    const deal = await prisma.deal.create({
      data: {
        title: 'Route Coverage Deal',
        price: 100,
        category: 'coverage',
        source: 'ebay',
        sourceId: `coverage-${Date.now()}`,
        status: 'active',
      },
    });
    dealId = deal.id;
  });

  afterEach(() => {
    config.operatorIngestToken = originalOperatorIngestToken;
  });

  it('returns ranked deals payload for deals with tmv and score', async () => {
    await prisma.tMVResult.create({
      data: {
        dealId,
        tmv: 130,
        confidence: 0.7,
        sampleCount: 8,
        volatility: 0.3,
        liquidityScore: 0.75,
        estimatedDaysToSell: 6,
      },
    });

    await prisma.score.create({
      data: {
        dealId,
        profitMargin: 0.2,
        velocityScore: 0.6,
        riskScore: 0.3,
        compositeRank: 72,
      },
    });

    const response = await request(app)
      .get('/api/v1/ranked')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('tmv');
    expect(response.body[0]).toHaveProperty('score');
  });

  it('rejects invalid ranked limits', async () => {
    await request(app)
      .get('/api/v1/ranked?limit=not-a-number')
      .expect(400);
  });

  it('orders ranked deals by displayed composite rank', async () => {
    await prisma.tMVResult.create({
      data: {
        dealId,
        tmv: 130,
        confidence: 0.7,
        sampleCount: 8,
        volatility: 0.3,
        liquidityScore: 0.75,
        estimatedDaysToSell: 6,
      },
    });
    await prisma.score.create({
      data: {
        dealId,
        profitMargin: 0.8,
        velocityScore: 0.9,
        riskScore: 0.1,
        compositeRank: 60,
      },
    });
    const betterDeal = await prisma.deal.create({
      data: {
        title: 'Higher Composite Rank Deal',
        price: 120,
        category: 'coverage',
        source: 'ebay',
        sourceId: `coverage-high-${Date.now()}`,
        status: 'active',
      },
    });
    await prisma.tMVResult.create({
      data: {
        dealId: betterDeal.id,
        tmv: 160,
        confidence: 0.8,
        sampleCount: 10,
        volatility: 0.2,
        liquidityScore: 0.8,
        estimatedDaysToSell: 5,
      },
    });
    await prisma.score.create({
      data: {
        dealId: betterDeal.id,
        profitMargin: 0.1,
        velocityScore: 0.2,
        riskScore: 0.6,
        compositeRank: 95,
      },
    });

    const response = await request(app)
      .get('/api/v1/ranked?limit=2')
      .expect(200);

    expect(response.body.map((deal: { id: string }) => deal.id)).toEqual([betterDeal.id, dealId]);
    expect(response.body.map((deal: { score: { compositeRank: number } }) => deal.score.compositeRank)).toEqual([95, 60]);
  });

  it('scores a deal and handles not-found / missing tmv branches', async () => {
    await request(app)
      .post('/api/v1/score')
      .set('X-Operator-Token', 'operator-secret')
      .send({ dealId: 'does-not-exist' })
      .expect(404);

    await request(app)
      .post('/api/v1/score')
      .set('X-Operator-Token', 'operator-secret')
      .send({ dealId })
      .expect(400);

    await prisma.tMVResult.create({
      data: {
        dealId,
        tmv: 140,
        confidence: 0.85,
        sampleCount: 12,
        volatility: 0.2,
        liquidityScore: 0.9,
        estimatedDaysToSell: 5,
      },
    });

    const success = await request(app)
      .post('/api/v1/score')
      .set('X-Operator-Token', 'operator-secret')
      .send({ dealId })
      .expect(200);

    expect(success.body).toHaveProperty('compositeRank');
  });

  it('uses source fee fallback when source is unknown', async () => {
    const unknownSourceDeal = await prisma.deal.create({
      data: {
        title: 'Unknown Source',
        price: 80,
        category: 'coverage',
        source: 'some-new-market',
        sourceId: `unknown-${Date.now()}`,
        status: 'active',
      },
    });

    await prisma.tMVResult.create({
      data: {
        dealId: unknownSourceDeal.id,
        tmv: 100,
        confidence: 0.7,
        sampleCount: 8,
        volatility: 0.2,
        liquidityScore: 0.8,
        estimatedDaysToSell: 7,
      },
    });

    const response = await request(app)
      .post('/api/v1/score')
      .set('X-Operator-Token', 'operator-secret')
      .send({ dealId: unknownSourceDeal.id })
      .expect(200);

    expect(response.body.compositeRank).toBeDefined();
  });
});
