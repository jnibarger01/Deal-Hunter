import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import config from '../config/env';
import prisma from '../config/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

const authenticateBearerToken = async (req: AuthRequest) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('No token provided', 401);
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: string;
      email: string;
      role: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token expired', 401);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token', 401);
    }
    throw error;
  }
};

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    await authenticateBearerToken(req);
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

export const authorizeOperatorOrAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const operatorTokenHeader = req.header('X-Operator-Token');

  if (config.operatorIngestToken && operatorTokenHeader) {
    if (operatorTokenHeader === config.operatorIngestToken) {
      req.user = {
        id: 'operator',
        email: 'operator@deal-hunter.local',
        role: 'admin',
      };
      next();
      return;
    }

    if (!req.headers.authorization?.startsWith('Bearer ')) {
      next(new AppError('Invalid operator token', 401));
      return;
    }
  }

  authenticate(req, res, (error?: unknown) => {
    if (error) {
      next(error);
      return;
    }

    authorize('admin')(req, res, next);
  });
};

export const authorizeOperatorOrAdminIfConfigured = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!config.operatorIngestToken) {
    authenticate(req, res, (error?: unknown) => {
      if (error) {
        next(error);
        return;
      }

      authorize('admin')(req, res, next);
    });
    return;
  }

  await authorizeOperatorOrAdmin(req, res, next);
};
