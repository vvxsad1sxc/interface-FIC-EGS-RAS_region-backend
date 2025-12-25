import express from 'express';
import { AuthController } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Существующие маршруты
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/profile', authMiddleware, AuthController.getProfile);

// Новые маршруты для восстановления пароля
router.post('/forgot-password', AuthController.forgotPassword);
router.get('/verify-reset-token', AuthController.verifyResetToken);
router.post('/reset-password', AuthController.resetPassword);
router.delete('/cleanup-tokens', authMiddleware, AuthController.cleanupTokens);

router.get('/test', (req, res) => {
  console.log('✅ Test endpoint works!');
  res.json({ success: true, message: 'Backend is working!' });
});

export default router;