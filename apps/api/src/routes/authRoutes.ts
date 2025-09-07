import { Router } from 'express';
import {
  register,
  login,
  getCurrentUser,
  updateUserProfile,
  getNotificationPreferences,
  updateNotificationPreferences,
  requestMagicLink,
  magicLinkLogin,
  changePassword
} from '../controllers/authController';
import {
  googleAuth,
  googleCallback
} from '../controllers/googleAuthController';
import { uploadAvatar, handleAvatarUpload, deleteAvatar } from '../controllers/avatarController';
import { authenticate } from '../middlewares/authMiddleware';
import { authRateLimiter, magicLinkRateLimiter } from '../middlewares/rateLimiter';
import { checkDatabaseConnection } from '../middlewares/checkDatabase';

const router = Router();

// Registration
router.post('/register', authRateLimiter, checkDatabaseConnection, register);

// Login with email and password
// TEMPORARILY DISABLED RATE LIMITER FOR DEBUGGING
// router.post('/login', authRateLimiter, checkDatabaseConnection, login);
router.post('/login', checkDatabaseConnection, login);

// Get current user
router.get('/me', authenticate, getCurrentUser);

// Update user profile
router.put('/profile', authenticate, updateUserProfile);

// Avatar upload
router.post('/avatar', authenticate, uploadAvatar, handleAvatarUpload);
router.delete('/avatar', authenticate, deleteAvatar);

// Notification preferences
router.get('/notification-preferences', authenticate, getNotificationPreferences);
router.put('/notification-preferences', authenticate, updateNotificationPreferences);

// Change password
router.put('/change-password', authenticate, changePassword);

// Magic link authentication
router.post('/request-magic-link', magicLinkRateLimiter, requestMagicLink);
router.get('/magic-link', magicLinkLogin);

// Google OAuth
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

export default router;