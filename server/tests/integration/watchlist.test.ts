import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../setup';

describe('Watchlist API', () => {
  let accessToken: string;
  let userId: string;
  let dealId: string;

  beforeEach(async () => {
    // Create user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'user@example.com',
        password: 'Test123!',
      });

    accessToken = userResponse.body.data.tokens.accessToken;
    userId = userResponse.body.data.user.id;

    // Create a deal
    const deal = await prisma.deal.create({
      data: {
        title: 'Test Deal',
        price: 100,
        marketValue: 200,
        estimatedProfit: 80,
        dealScore: 75,
        roi: 80,
        category: 'test',
        condition: 'good',
        itemUrl: 'https://example.com/test',
        marketplace: 'test',
      },
    });

    dealId = deal.id;
  });

  describe('GET /api/v1/watchlist', () => {
    it('should get empty watchlist', async () => {
      const response = await request(app)
        .get('/api/v1/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(0);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/watchlist')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/watchlist', () => {
    it('should add deal to watchlist', async () => {
      const response = await request(app)
        .post('/api/v1/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          dealId,
          notes: 'Interesting deal',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.item.dealId).toBe(dealId);
      expect(response.body.data.item.notes).toBe('Interesting deal');
    });

    it('should fail to add same deal twice', async () => {
      // Add once
      await request(app)
        .post('/api/v1/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ dealId })
        .expect(201);

      // Try to add again
      const response = await request(app)
        .post('/api/v1/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ dealId })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already in watchlist');
    });

    it('should fail with non-existent deal', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post('/api/v1/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ dealId: fakeId })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/watchlist/:dealId', () => {
    beforeEach(async () => {
      // Add deal to watchlist
      await request(app)
        .post('/api/v1/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ dealId });
    });

    it('should remove deal from watchlist', async () => {
      const response = await request(app)
        .delete(`/api/v1/watchlist/${dealId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify it's removed
      const getResponse = await request(app)
        .get('/api/v1/watchlist')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(getResponse.body.data.items).toHaveLength(0);
    });

    it('should fail to remove non-existent item', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/v1/watchlist/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/watchlist/:dealId/notes', () => {
    beforeEach(async () => {
      // Add deal to watchlist
      await request(app)
        .post('/api/v1/watchlist')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ dealId, notes: 'Original notes' });
    });

    it('should update notes', async () => {
      const response = await request(app)
        .patch(`/api/v1/watchlist/${dealId}/notes`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ notes: 'Updated notes' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.item.notes).toBe('Updated notes');
    });
  });
});
