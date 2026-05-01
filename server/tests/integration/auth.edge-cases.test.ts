import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../setup';
import config from '../../src/config/env';

const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

describe('Auth edge-case flows', () => {
  it('returns account deactivated for inactive users when verification is not required', async () => {
    const email = uniqueEmail('inactive');
    const hashedPassword = await bcrypt.hash('Test123!', 10);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        isActive: false,
      },
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'Test123!' })
      .expect(401);

    expect(response.body.error.message).toContain('deactivated');
  });

  it('invalidates refresh token when token row is expired', async () => {
    const email = uniqueEmail('refresh-expired');
    const hashedPassword = await bcrypt.hash('Test123!', 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, isActive: true },
    });

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    expect(stored).toBeNull();
  });

  it('rejects refresh for inactive users', async () => {
    const email = uniqueEmail('refresh-inactive');
    const hashedPassword = await bcrypt.hash('Test123!', 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, isActive: false },
    });

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    expect(response.body.error.message).toContain('deactivated');
  });

  it('rejects verify-email token with wrong purpose', async () => {
    const email = uniqueEmail('verify-purpose');
    const hashedPassword = await bcrypt.hash('Test123!', 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, isActive: false },
    });

    const wrongPurposeToken = jwt.sign(
      { purpose: 'reset-password', userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    const response = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: wrongPurposeToken })
      .expect(400);

    expect(response.body.error.message).toContain('Invalid verification token');
  });

  it('rejects reset-password token with wrong purpose', async () => {
    const email = uniqueEmail('reset-purpose');
    const hashedPassword = await bcrypt.hash('OldPass123', 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, isActive: true },
    });

    const wrongPurposeToken = jwt.sign(
      { purpose: 'verify-email', userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: wrongPurposeToken, newPassword: 'NewPass123' })
      .expect(400);

    expect(response.body.error.message).toContain('Invalid reset token');
  });

  it('returns generic success for resend-verification when user is missing or already active', async () => {
    const missingResponse = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: uniqueEmail('missing') })
      .expect(200);

    expect(missingResponse.body.success).toBe(true);

    const activeEmail = uniqueEmail('active');
    const hashedPassword = await bcrypt.hash('Test123!', 10);
    await prisma.user.create({
      data: {
        email: activeEmail,
        password: hashedPassword,
        isActive: true,
      },
    });

    const activeResponse = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: activeEmail })
      .expect(200);

    expect(activeResponse.body.success).toBe(true);
  });
});
