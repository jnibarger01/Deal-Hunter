import { Router } from 'express';
import { body } from 'express-validator';
import authController from '../controllers/auth.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

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
router.post('/register', validate(registerValidation), authController.register);
router.post('/login', validate(loginValidation), authController.login);
router.post('/refresh', validate(refreshTokenValidation), authController.refreshToken);
router.post('/logout', validate(refreshTokenValidation), authController.logout);
router.post('/forgot-password', validate(emailValidation), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordValidation), authController.resetPassword);
router.post('/verify-email', validate(verifyEmailValidation), authController.verifyEmail);
router.post('/resend-verification', validate(emailValidation), authController.resendVerification);
router.get('/profile', authenticate, authController.getProfile);

export default router;
