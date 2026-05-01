import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../setup';
import bcrypt from 'bcryptjs';
import config from '../../src/config/env';
import emailService from '../../src/services/email.service';

const uniqueTestEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

describe('Authentication API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should fail with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Test123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test123!',
      };

      // Register first time
      await request(app).post('/api/v1/auth/register').send(userData).expect(201);

      // Try to register again
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const userCredentials = {
      email: 'test@example.com',
      password: 'Test123!',
    };

    beforeEach(async () => {
      // Create user
      const hashedPassword = await bcrypt.hash(userCredentials.password, 10);
      await prisma.user.create({
        data: {
          email: userCredentials.email,
          password: hashedPassword,
          firstName: 'Test',
          lastName: 'User',
        },
      });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(userCredentials)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userCredentials.email);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should fail with incorrect password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userCredentials.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    it('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid credentials');
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let accessToken: string;
    let email: string;

    beforeEach(async () => {
      email = uniqueTestEmail('profile');

      // Register and get token
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'Test123!',
        })
        .expect(201);

      expect(response.body.data.tokens).toBeDefined();
      accessToken = response.body.data.tokens.accessToken;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe(email);
    });

    it('should fail without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;
    let email: string;

    beforeEach(async () => {
      email = uniqueTestEmail('refresh');
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'Test123!',
        })
        .expect(201);

      expect(response.body.data.tokens).toBeDefined();
      refreshToken = response.body.data.tokens.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let refreshToken: string;
    let email: string;

    beforeEach(async () => {
      email = uniqueTestEmail('logout');
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'Test123!',
        })
        .expect(201);

      expect(response.body.data.tokens).toBeDefined();
      refreshToken = response.body.data.tokens.refreshToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify token is deleted by trying to use it
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(refreshResponse.body.success).toBe(false);
    });
  });

  describe('Password and verification lifecycle', () => {
    const originalRequireVerifiedEmail = config.auth.requireVerifiedEmail;

    afterEach(() => {
      config.auth.requireVerifiedEmail = originalRequireVerifiedEmail;
      jest.restoreAllMocks();
    });

    it('should verify email with a valid token', async () => {
      config.auth.requireVerifiedEmail = true;
      const sendVerification = jest
        .spyOn(emailService, 'sendEmailVerification')
        .mockResolvedValue(undefined);

      const email = uniqueTestEmail('verify');
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email, password: 'Test123!' })
        .expect(201);

      const rawToken = sendVerification.mock.calls[0]?.[1];
      expect(rawToken).toEqual(expect.any(String));

      const response = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: rawToken })
        .expect(200);

      expect(response.body.success).toBe(true);

      const verified = await prisma.user.findUnique({ where: { email } });
      expect(verified?.isActive).toBe(true);
    });

    it('rejects verification token replay after successful use', async () => {
      config.auth.requireVerifiedEmail = true;
      const sendVerification = jest
        .spyOn(emailService, 'sendEmailVerification')
        .mockResolvedValue(undefined);

      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: uniqueTestEmail('verify-replay'), password: 'Test123!' })
        .expect(201);

      const rawToken = sendVerification.mock.calls[0]?.[1];
      expect(rawToken).toEqual(expect.any(String));

      await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: rawToken })
        .expect(200);

      const replay = await request(app)
        .post('/api/v1/auth/verify-email')
        .send({ token: rawToken })
        .expect(400);

      expect(replay.body.error.message).toContain('Invalid or expired verification token');
    });

    it('should reset password and invalidate existing refresh tokens', async () => {
      const hashedPassword = await bcrypt.hash('OldPass123', 10);
      const user = await prisma.user.create({
        data: {
          email: 'reset@example.com',
          password: hashedPassword,
          isActive: true,
        },
      });

      await prisma.refreshToken.create({
        data: {
          token: 'legacy-refresh-token',
          userId: user.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const sendPasswordReset = jest
        .spyOn(emailService, 'sendPasswordReset')
        .mockResolvedValue(undefined);

      await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: user.email })
        .expect(200);

      const rawToken = sendPasswordReset.mock.calls[0]?.[1];
      expect(rawToken).toEqual(expect.any(String));

      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'NewPass123' })
        .expect(200);

      expect(response.body.success).toBe(true);

      const updated = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updated).not.toBeNull();
      expect(await bcrypt.compare('NewPass123', updated!.password)).toBe(true);

      const activeTokens = await prisma.refreshToken.findMany({ where: { userId: user.id } });
      expect(activeTokens).toHaveLength(0);
    });

    it('rejects password reset token replay after successful use', async () => {
      const hashedPassword = await bcrypt.hash('OldPass123', 10);
      const user = await prisma.user.create({
        data: {
          email: uniqueTestEmail('reset-replay'),
          password: hashedPassword,
          isActive: true,
        },
      });
      const sendPasswordReset = jest
        .spyOn(emailService, 'sendPasswordReset')
        .mockResolvedValue(undefined);

      await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: user.email })
        .expect(200);

      const rawToken = sendPasswordReset.mock.calls[0]?.[1];
      expect(rawToken).toEqual(expect.any(String));

      await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'NewPass123' })
        .expect(200);

      const replay = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, newPassword: 'OtherPass123' })
        .expect(400);

      expect(replay.body.error.message).toContain('Invalid or expired reset token');
    });

    it('rejects older outstanding reset links after a newer reset succeeds', async () => {
      const hashedPassword = await bcrypt.hash('OldPass123', 10);
      const user = await prisma.user.create({
        data: {
          email: uniqueTestEmail('reset-multiple'),
          password: hashedPassword,
          isActive: true,
        },
      });
      const sendPasswordReset = jest
        .spyOn(emailService, 'sendPasswordReset')
        .mockResolvedValue(undefined);

      await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: user.email })
        .expect(200);
      await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: user.email })
        .expect(200);

      const firstToken = sendPasswordReset.mock.calls[0]?.[1];
      const secondToken = sendPasswordReset.mock.calls[1]?.[1];
      expect(firstToken).toEqual(expect.any(String));
      expect(secondToken).toEqual(expect.any(String));

      await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: secondToken, newPassword: 'NewPass123' })
        .expect(200);

      const staleReset = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: firstToken, newPassword: 'OtherPass123' })
        .expect(400);

      expect(staleReset.body.error.message).toContain('Invalid or expired reset token');
    });

    it('should return generic response for forgot-password with unknown account', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'missing@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('If an account exists');
    });
  });
});
