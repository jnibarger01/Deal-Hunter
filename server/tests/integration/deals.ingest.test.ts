import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../setup';

describe('Deals ingest API', () => {
  let accessToken: string;

  beforeEach(async () => {
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'ingest@example.com',
        password: 'Test123!',
      });

    accessToken = userResponse.body.data.tokens.accessToken;
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
});
