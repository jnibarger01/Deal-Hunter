import request from 'supertest';
import app from '../../src/app';
import config from '../../src/config/env';
import { prisma } from '../setup';

const uniqueTestEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

describe('Deals ingest API', () => {
  let accessToken: string;
  const originalOperatorIngestToken = config.operatorIngestToken;

  beforeEach(async () => {
    config.operatorIngestToken = originalOperatorIngestToken;

    const adminEmail = uniqueTestEmail('ingest-admin');

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: 'hashedpassword',
        role: 'admin',
      },
    });

    const jwt = require('jsonwebtoken');
    accessToken = jwt.sign(
      { userId: admin.id, email: admin.email, role: admin.role },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
  });

  afterEach(() => {
    config.operatorIngestToken = originalOperatorIngestToken;
  });

  it('rejects invalid listings and reports errors', async () => {
    const response = await request(app)
      .post('/api/v1/deals/ingest')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        source: 'test',
        listings: [
          { title: '', category: '', price: -5 },
          null,
        ],
      })
      .expect(200);

    expect(response.body.accepted).toBe(0);
    expect(response.body.rejected).toBe(2);
    expect(response.body.errors.length).toBe(2);
  });

  it('accepts valid listings and upserts deals', async () => {
    const response = await request(app)
      .post('/api/v1/deals/ingest')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        source: 'ingest-test',
        listings: [
          {
            id: 'listing-1',
            title: 'Test Listing',
            category: 'electronics',
            price: 25.5,
          },
        ],
      })
      .expect(200);

    expect(response.body.accepted).toBe(1);
    expect(response.body.rejected).toBe(0);

    const deal = await prisma.deal.findUnique({
      where: { source_sourceId: { source: 'ingest-test', sourceId: 'listing-1' } },
    });

    expect(deal).toBeTruthy();
    expect(deal?.title).toBe('Test Listing');
  });

  it('accepts ingest requests with a matching X-Operator-Token and no JWT', async () => {
    config.operatorIngestToken = 'operator-secret';

    const response = await request(app)
      .post('/api/v1/deals/ingest')
      .set('X-Operator-Token', 'operator-secret')
      .send({
        source: 'operator-ingest',
        listings: [
          {
            id: 'listing-operator-1',
            title: 'Operator Listing',
            category: 'electronics',
            price: 40,
          },
        ],
      })
      .expect(200);

    expect(response.body.accepted).toBe(1);
    expect(response.body.rejected).toBe(0);

    const deal = await prisma.deal.findUnique({
      where: { source_sourceId: { source: 'operator-ingest', sourceId: 'listing-operator-1' } },
    });

    expect(deal?.title).toBe('Operator Listing');
  });

  it('rejects ingest requests with an invalid X-Operator-Token and no JWT', async () => {
    config.operatorIngestToken = 'operator-secret';

    const response = await request(app)
      .post('/api/v1/deals/ingest')
      .set('X-Operator-Token', 'wrong-secret')
      .send({
        source: 'operator-ingest',
        listings: [
          {
            id: 'listing-operator-1',
            title: 'Operator Listing',
            category: 'electronics',
            price: 40,
          },
        ],
      })
      .expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        message: 'Invalid operator token',
      },
    });
  });

  it('lets a matching X-Operator-Token reach the Craigslist ingest handler without a JWT', async () => {
    config.operatorIngestToken = 'operator-secret';

    const response = await request(app)
      .post('/api/v1/deals/ingest/craigslist')
      .set('X-Operator-Token', 'operator-secret')
      .send({})
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: 'Provide rssUrls array with one or more Craigslist feed URLs',
    });
  });
});
