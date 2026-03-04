import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import authController from '../controllers/auth.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import config from '../config/env';

const router = Router();
const authLimiter = rateLimit({
  windowMs: config.authRateLimit.windowMs,
  max: config.authRateLimit.max,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
});

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];

const emailValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
];

const verifyEmailValidation = [
  body('token').isString().trim().notEmpty().withMessage('Verification token is required'),
];

const resetPasswordValidation = [
  body('token').isString().trim().notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
];

// Routes
router.post('/register', authLimiter, validate(registerValidation), authController.register);
router.post('/login', authLimiter, validate(loginValidation), authController.login);
router.post('/refresh', validate(refreshTokenValidation), authController.refreshToken);
router.post('/logout', validate(refreshTokenValidation), authController.logout);
router.post('/forgot-password', authLimiter, validate(emailValidation), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordValidation), authController.resetPassword);
router.post('/verify-email', authLimiter, validate(verifyEmailValidation), authController.verifyEmail);
router.post('/resend-verification', authLimiter, validate(emailValidation), authController.resendVerification);
router.get('/profile', authenticate, authController.getProfile);

export default router;
