import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { User } from '@prisma/client';
import prisma from '../config/database';
import config from '../config/env';
import { AppError } from '../middleware/errorHandler';
import emailService from './email.service';

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface OneTimeTokenPayload {
  purpose: 'verify-email' | 'reset-password';
  email: string;
  userId: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface RegisterResult {
  user: Omit<User, 'password'>;
  tokens?: AuthTokens;
  verificationRequired: boolean;
}

export class AuthService {
  async register(data: RegisterData): Promise<RegisterResult> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        isActive: !config.auth.requireVerifiedEmail,
      },
    });

    if (config.auth.requireVerifiedEmail) {
      const verificationToken = this.createOneTimeToken(user, 'verify-email', config.auth.emailVerificationTokenTtlHours * 60 * 60);
      await emailService.sendEmailVerification(user.email, verificationToken);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;

    if (config.auth.requireVerifiedEmail) {
      return {
        user: userWithoutPassword,
        verificationRequired: true,
      };
    }

    const tokens = await this.generateAuthTokens(user);
    return {
      user: userWithoutPassword,
      tokens,
      verificationRequired: false,
    };
  }

  async login(data: LoginData): Promise<{ user: Omit<User, 'password'>; tokens: AuthTokens }> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    if (!user.isActive) {
      if (config.auth.requireVerifiedEmail) {
        throw new AppError('Email verification required', 403);
      }
      throw new AppError('Account is deactivated', 401);
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const tokens = await this.generateAuthTokens(user);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      jwt.verify(refreshToken, config.jwt.secret) as TokenPayload;

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken) {
        throw new AppError('Invalid refresh token', 401);
      }

      if (storedToken.expiresAt < new Date()) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        throw new AppError('Refresh token expired', 401);
      }

      if (!storedToken.user.isActive) {
        throw new AppError('User account is deactivated', 401);
      }

      const newTokens = await this.generateAuthTokens(storedToken.user);
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });

      return newTokens;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid refresh token', 401);
      }
      throw error;
    }
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async verifyEmail(token: string): Promise<void> {
    let payload: OneTimeTokenPayload;

    try {
      payload = jwt.verify(token, config.jwt.secret) as OneTimeTokenPayload;
    } catch {
      throw new AppError('Invalid or expired verification token', 400);
    }

    if (payload.purpose !== 'verify-email') {
      throw new AppError('Invalid verification token', 400);
    }

    await prisma.user.update({
      where: { id: payload.userId, email: payload.email },
      data: { isActive: true },
    });
  }

  async resendVerification(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || user.isActive) {
      return;
    }

    const token = this.createOneTimeToken(user, 'verify-email', config.auth.emailVerificationTokenTtlHours * 60 * 60);
    await emailService.sendEmailVerification(user.email, token);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Generic success response by caller to prevent account enumeration.
    if (!user) {
      return;
    }

    const resetToken = this.createOneTimeToken(user, 'reset-password', config.auth.passwordResetTokenTtlMinutes * 60);
    await emailService.sendPasswordReset(user.email, resetToken);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    let payload: OneTimeTokenPayload;

    try {
      payload = jwt.verify(token, config.jwt.secret) as OneTimeTokenPayload;
    } catch {
      throw new AppError('Invalid or expired reset token', 400);
    }

    if (payload.purpose !== 'reset-password') {
      throw new AppError('Invalid reset token', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: payload.userId, email: payload.email },
        data: { password: hashedPassword },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: payload.userId },
      }),
    ]);
  }

  private createOneTimeToken(user: User, purpose: OneTimeTokenPayload['purpose'], expiresInSeconds: number): string {
    const payload: OneTimeTokenPayload = {
      purpose,
      userId: user.id,
      email: user.email,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: expiresInSeconds,
      jwtid: randomUUID(),
    });
  }

  private async generateAuthTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as SignOptions['expiresIn'],
      jwtid: randomUUID(),
    });

    const refreshToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn as SignOptions['expiresIn'],
      jwtid: randomUUID(),
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}

export default new AuthService();
