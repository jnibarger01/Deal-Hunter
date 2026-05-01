import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import logger from '../config/logger';
import { AuthRequest } from '../middleware/auth';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName } = req.body;

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
      });

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          ...(result.tokens ? { tokens: result.tokens } : {}),
          verificationRequired: result.verificationRequired,
        },
        message: result.verificationRequired
          ? 'User registered. Verify your email to continue.'
          : 'User registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const result = await authService.login({ email, password });

      logger.info(`User logged in: ${email}`);

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: { message: 'Refresh token is required' },
        });
      }

      const tokens = await authService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        data: { tokens },
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: { message: 'Refresh token is required' },
        });
      }

      await authService.logout(refreshToken);

      logger.info('User logged out');

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // User is already attached to req by auth middleware
      res.status(200).json({
        success: true,
        data: { user: req.user },
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await authService.requestPasswordReset(email);

      res.status(200).json({
        success: true,
        message: 'If an account exists, a reset email has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password reset successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;
      await authService.verifyEmail(token);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await authService.resendVerification(email);

      res.status(200).json({
        success: true,
        message: 'If an account exists, a verification email has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
