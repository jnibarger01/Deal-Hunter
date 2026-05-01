import request from 'supertest';
import { ListingStatus } from '@prisma/client';
import app from '../../src/app';
import config from '../../src/config/env';
import { prisma } from '../setup';

describe('Analysis API', () => {
  const originalOperatorIngestToken = config.operatorIngestToken;

  beforeEach(() => {
    config.operatorIngestToken = 'operator-secret';
  });

  afterEach(() => {
    config.operatorIngestToken = originalOperatorIngestToken;
  });

  it('calculates tmv, score, and returns ranked deals', async () => {
    const deal = await prisma.deal.create({
      data: {
        title: 'Ranked Test Deal',
        price: 100,
        category: 'test',
        condition: 'good',
        source: 'manual',
        sourceId: 'ranked-test-1',
        status: 'active',
      },
    });

    const now = Date.now();
    const samples = Array.from({ length: 8 }).map((_, index) => {
      const listedAt = new Date(now - (index + 10) * 24 * 60 * 60 * 1000);
      const soldAt = new Date(now - index * 24 * 60 * 60 * 1000);

      return {
        dealId: deal.id,
        observedPrice: 120 + index,
        observedAt: soldAt,
        source: 'ebay',
        status: ListingStatus.sold,
        finalPrice: 125 + index,
        listedAt,
        soldAt,
      };
    });

    await prisma.marketSample.createMany({ data: samples });

    const tmvResponse = await request(app)
      .post('/api/v1/tmv/calculate')
      .set('X-Operator-Token', 'operator-secret')
      .send({ dealId: deal.id })
      .expect(200);

    expect(tmvResponse.body).toHaveProperty('dealId', deal.id);
    expect(tmvResponse.body).toHaveProperty('tmv');

    const tmvGetResponse = await request(app)
      .get(`/api/v1/tmv/${deal.id}`)
      .expect(200);

    expect(tmvGetResponse.body.dealId).toBe(deal.id);

    const scoreResponse = await request(app)
      .post('/api/v1/score')
      .set('X-Operator-Token', 'operator-secret')
      .send({
        dealId: deal.id,
        feeAssumptions: {
          platformFeeRate: 0.1,
          shippingCost: 5,
          fixedFees: 2,
        },
      })
      .expect(200);

    expect(scoreResponse.body).toHaveProperty('dealId', deal.id);
    expect(scoreResponse.body).toHaveProperty('compositeRank');

    const rankedResponse = await request(app)
      .get('/api/v1/ranked')
      .expect(200);

    expect(Array.isArray(rankedResponse.body)).toBe(true);
    expect(rankedResponse.body.length).toBeGreaterThan(0);
    expect(rankedResponse.body[0]).toHaveProperty('tmv');
    expect(rankedResponse.body[0]).toHaveProperty('score');
  });

  it('returns deal intelligence from the frontend contract endpoint', async () => {
    const deal = await prisma.deal.create({
      data: {
        title: 'Intelligence Contract Deal',
        price: 100,
        category: 'electronics',
        condition: 'good',
        source: 'ebay',
        sourceId: 'intelligence-contract-1',
        status: 'active',
      },
    });

    const response = await request(app)
      .get(`/api/v1/deal-intelligence/${deal.id}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        repairAnalysis: expect.objectContaining({
          skillLevel: expect.any(String),
          summary: expect.any(String),
        }),
        marketDynamics: expect.objectContaining({
          targetPrice: expect.any(Number),
          priceHistory: expect.any(Array),
        }),
        negotiation: expect.objectContaining({
          targetOffer: expect.any(Number),
          openingScript: expect.any(String),
        }),
      },
    });
  });

  it('returns tmv assumptions from the frontend contract endpoint', async () => {
    const deal = await prisma.deal.create({
      data: {
        title: 'Assumptions Contract Deal',
        price: 100,
        category: 'electronics',
        source: 'ebay',
        sourceId: 'assumptions-contract-1',
        status: 'active',
      },
    });
    await prisma.tMVResult.create({
      data: {
        dealId: deal.id,
        tmv: 150,
        confidence: 0.8,
        sampleCount: 10,
        volatility: 0.2,
        liquidityScore: 0.7,
        estimatedDaysToSell: 6,
      },
    });

    const response = await request(app)
      .get('/api/v1/tmv/assumptions?source=ebay&category=electronics')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        source: 'ebay',
        category: 'electronics',
        sampleSize: 1,
        recommendedMarkupPct: 50,
        recommendedFeePct: 17.5,
      },
    });
  });

  it('creates, lists, and deletes tmv scenarios from the frontend contract endpoints', async () => {
    const createResponse = await request(app)
      .post('/api/v1/tmv/scenarios')
      .set('X-Operator-Token', 'operator-secret')
      .send({
        name: 'Contract Scenario',
        category: 'electronics',
        source: 'ebay',
        buyPrice: 100,
        expectedSalePrice: 180,
        shippingCost: 12,
        platformFeePct: 13,
        prepCost: 5,
        taxPct: 0,
      })
      .expect(201);

    expect(createResponse.body).toMatchObject({
      success: true,
      data: expect.objectContaining({
        id: expect.any(String),
        name: 'Contract Scenario',
        buyPrice: 100,
      }),
    });

    const id = createResponse.body.data.id;

    const listResponse = await request(app)
      .get('/api/v1/tmv/scenarios')
      .expect(200);

    expect(listResponse.body).toMatchObject({
      success: true,
      data: [expect.objectContaining({ id })],
    });

    await request(app)
      .delete(`/api/v1/tmv/scenarios/${id}`)
      .set('X-Operator-Token', 'operator-secret')
      .expect(200);

    await expect(prisma.tMVScenario.findUnique({ where: { id } })).resolves.toBeNull();
  });

  it('rejects unauthenticated tmv scenario mutations', async () => {
    const createResponse = await request(app)
      .post('/api/v1/tmv/scenarios')
      .send({
        name: 'Blocked Scenario',
        buyPrice: 100,
        expectedSalePrice: 180,
      })
      .expect(401);

    expect(createResponse.body.success).toBe(false);

    await request(app)
      .delete('/api/v1/tmv/scenarios/some-id')
      .expect(401);
  });
});
