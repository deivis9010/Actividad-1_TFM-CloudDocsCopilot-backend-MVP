import express from 'express';
import * as authController from '../controllers/auth.controller';
import { authRateLimiter } from '../middlewares/rate-limit.middleware';
import authMiddleware from '../middlewares/auth.middleware';
import { csrfProtectionMiddleware } from '../app';

const router = express.Router();

// Aplica limitación de tasa estricta a endpoints de autenticación para prevenir ataques de fuerza bruta
router.post('/register', csrfProtectionMiddleware, authRateLimiter, authController.register);
router.post('/login', csrfProtectionMiddleware, authRateLimiter, authController.login);
router.post('/logout', csrfProtectionMiddleware, authMiddleware, authController.logout);

export default router;
