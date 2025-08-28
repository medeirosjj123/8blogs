import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUserDocument } from '../models/User';
import { 
  hashPassword, 
  comparePassword, 
  generateJWT, 
  generateMagicLinkToken,
  validatePassword,
  validateEmail
} from '../utils/auth';
import { AuthRequest } from '../middlewares/authMiddleware';
import { emailService } from '../services/email.service';
import NotificationService from '../services/notificationService';
import pino from 'pino';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  }
});

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body;
    
    // Validate input
    if (!email || !password || !name) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, password, and name are required'
      });
      return;
    }
    
    // Validate email format
    if (!validateEmail(email)) {
      res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
      return;
    }
    
    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      res.status(400).json({
        error: 'Weak password',
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors
      });
      return;
    }
    
    // Check if user already exists (with protection against enumeration)
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      // Return same message as success to prevent email enumeration
      res.status(201).json({
        message: 'Registration initiated. Please check your email for verification.'
      });
      return;
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create new user
    const newUser = new User({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: 'aluno',
      emailVerified: false
    });
    
    await newUser.save();
    
    logger.info({ userId: newUser._id, email: newUser.email }, 'New user registered');
    
    // Create welcome notification
    try {
      await NotificationService.createWelcomeNotification(newUser._id.toString());
      logger.info({ userId: newUser._id }, 'Welcome notification created');
    } catch (notificationError) {
      // Don't fail registration if notification fails
      logger.error({ error: notificationError, userId: newUser._id }, 'Failed to create welcome notification');
    }
    
    // Generate JWT token
    const token = generateJWT({
      userId: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role
    });
    
    res.status(201).json({
      success: true,
      data: {
        message: 'Registration successful',
        accessToken: token,
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          bio: newUser.bio,
          avatar: newUser.avatar,
          location: newUser.location,
          socialLinks: newUser.socialLinks,
          role: newUser.role,
          emailVerified: newUser.emailVerified
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Registration error');
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
      return;
    }
    
    // Find user and include password hash
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+passwordHash +loginAttempts +lockedUntil');
    
    // Debug logging
    console.log('Login attempt for:', email);
    console.log('User found:', !!user);
    if (user) {
      console.log('Login attempts:', user.loginAttempts);
      console.log('Locked until:', user.lockedUntil);
      console.log('Current time:', new Date());
      console.log('Is locked?:', user.lockedUntil && user.lockedUntil > new Date());
    }
    
    if (!user) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
      return;
    }
    
    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      console.log('Account is locked, returning 423');
      res.status(423).json({
        error: 'Account locked',
        message: 'Too many failed login attempts. Please try again later.'
      });
      return;
    }
    
    // Check password
    if (!user.passwordHash) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
      return;
    }
    
    const isValidPassword = await comparePassword(password, user.passwordHash);
    
    if (!isValidPassword) {
      await user.incrementLoginAttempts();
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
      return;
    }
    
    // Reset login attempts on successful login
    await user.resetLoginAttempts();
    
    // Update last login
    user.lastLoginAt = new Date();
    await user.save();
    
    // Generate JWT token
    const token = generateJWT({
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    });
    
    logger.info({ userId: user._id, email: user.email }, 'User logged in');
    
    res.json({
      success: true,
      data: {
        message: 'Login successful',
        accessToken: token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          bio: user.bio,
          avatar: user.avatar,
          location: user.location,
          socialLinks: user.socialLinks,
          role: user.role,
          emailVerified: user.emailVerified
        }
      }
    });
  } catch (error) {
    logger.error({ 
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error 
    }, 'Login error');
    
    // Check if it's a MongoDB connection error
    if (error instanceof Error && (
      error.message.includes('buffering timed out') ||
      error.message.includes('Connection') ||
      error.message.includes('ECONNREFUSED')
    )) {
      res.status(503).json({
        error: 'Database unavailable',
        message: 'Database connection is not available. Please try again later.'
      });
      return;
    }
    
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
}

export async function getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          bio: user.bio,
          avatar: user.avatar,
          location: user.location,
          socialLinks: user.socialLinks,
          role: user.role,
          emailVerified: user.emailVerified,
          membership: user.membership,
          abilities: user.abilities,
          interests: user.interests,
          lookingFor: user.lookingFor,
          availability: user.availability,
          personalInterests: user.personalInterests,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Get current user error');
    res.status(500).json({
      error: 'Failed to get user',
      message: 'An error occurred while fetching user data'
    });
  }
}

export async function updateUserProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const { name, bio, location, socialLinks, abilities, interests, lookingFor, availability, personalInterests } = req.body;
    
    // Validate input
    if (name !== undefined && (!name || typeof name !== 'string' || name.trim().length === 0)) {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Name must be a non-empty string'
      });
      return;
    }
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
      return;
    }
    
    // Update user fields
    if (name) {
      user.name = name.trim();
    }
    if (bio !== undefined) {
      user.bio = bio ? bio.trim().substring(0, 200) : '';
    }
    if (location !== undefined) {
      user.location = location ? location.trim().substring(0, 100) : '';
    }
    if (socialLinks) {
      user.socialLinks = {
        facebook: socialLinks.facebook || '',
        instagram: socialLinks.instagram || '',
        whatsapp: socialLinks.whatsapp || '',
        youtube: socialLinks.youtube || '',
        website: socialLinks.website || ''
      };
    }
    
    // Update networking fields
    if (abilities !== undefined) {
      user.abilities = Array.isArray(abilities) ? abilities : [];
    }
    if (interests !== undefined) {
      user.interests = Array.isArray(interests) ? interests : [];
    }
    if (lookingFor !== undefined) {
      user.lookingFor = Array.isArray(lookingFor) ? lookingFor : [];
    }
    if (availability !== undefined) {
      user.availability = availability;
    }
    if (personalInterests !== undefined) {
      user.personalInterests = personalInterests;
    }
    
    await user.save();
    
    logger.info({ userId: user._id }, 'User profile updated');
    
    res.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        bio: user.bio,
        avatar: user.avatar,
        location: user.location,
        socialLinks: user.socialLinks,
        role: user.role,
        emailVerified: user.emailVerified,
        membership: user.membership,
        abilities: user.abilities,
        interests: user.interests,
        lookingFor: user.lookingFor,
        availability: user.availability,
        personalInterests: user.personalInterests,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    logger.error({ error }, 'Update user profile error');
    res.status(500).json({
      error: 'Failed to update profile',
      message: 'An error occurred while updating user profile'
    });
  }
}

export async function getNotificationPreferences(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
      return;
    }
    
    // Initialize default notification preferences if they don't exist
    if (!user.notificationPreferences) {
      user.notificationPreferences = {
        emailNotifications: true,
        pushNotifications: true,
        communityMentions: true,
        courseUpdates: true,
        achievementUnlocked: true,
        weeklyDigest: true,
        marketingEmails: false
      };
      await user.save();
    }
    
    res.json({
      success: true,
      data: {
        notificationPreferences: user.notificationPreferences
      }
    });
  } catch (error) {
    logger.error({ error }, 'Get notification preferences error');
    res.status(500).json({
      error: 'Failed to get preferences',
      message: 'An error occurred while fetching notification preferences'
    });
  }
}

export async function updateNotificationPreferences(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }
    
    const { 
      emailNotifications, 
      pushNotifications, 
      communityMentions, 
      courseUpdates, 
      achievementUnlocked, 
      weeklyDigest, 
      marketingEmails 
    } = req.body;
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User does not exist'
      });
      return;
    }
    
    // Initialize default notification preferences if they don't exist
    if (!user.notificationPreferences) {
      user.notificationPreferences = {
        emailNotifications: true,
        pushNotifications: true,
        communityMentions: true,
        courseUpdates: true,
        achievementUnlocked: true,
        weeklyDigest: true,
        marketingEmails: false
      };
    }
    
    // Update notification preferences - only if explicitly provided
    if (typeof emailNotifications === 'boolean') {
      user.notificationPreferences.emailNotifications = emailNotifications;
    }
    if (typeof pushNotifications === 'boolean') {
      user.notificationPreferences.pushNotifications = pushNotifications;
    }
    if (typeof communityMentions === 'boolean') {
      user.notificationPreferences.communityMentions = communityMentions;
    }
    if (typeof courseUpdates === 'boolean') {
      user.notificationPreferences.courseUpdates = courseUpdates;
    }
    if (typeof achievementUnlocked === 'boolean') {
      user.notificationPreferences.achievementUnlocked = achievementUnlocked;
    }
    if (typeof weeklyDigest === 'boolean') {
      user.notificationPreferences.weeklyDigest = weeklyDigest;
    }
    if (typeof marketingEmails === 'boolean') {
      user.notificationPreferences.marketingEmails = marketingEmails;
    }
    
    await user.save();
    
    logger.info({ userId: user._id }, 'Notification preferences updated');
    
    res.json({
      success: true,
      data: {
        notificationPreferences: user.notificationPreferences
      }
    });
  } catch (error) {
    logger.error({ error }, 'Update notification preferences error');
    res.status(500).json({
      error: 'Failed to update preferences',
      message: 'An error occurred while updating notification preferences'
    });
  }
}

export async function requestMagicLink(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({
        error: 'Missing email',
        message: 'Email is required'
      });
      return;
    }
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If the email exists, a magic link has been sent.'
      });
      return;
    }
    
    // Generate magic link token
    const magicLinkData = generateMagicLinkToken();
    
    // Save token to user
    user.magicLinkToken = magicLinkData.token;
    user.magicLinkExpiresAt = magicLinkData.expiresAt;
    await user.save();
    
    // Send magic link email
    try {
      const emailResult = await emailService.sendMagicLinkEmail(user.email, magicLinkData.token, user.name);
      if (emailResult.success) {
        logger.info({ userId: user._id, email: user.email, messageId: emailResult.messageId }, 'Magic link email sent successfully');
      } else {
        logger.error({ userId: user._id, email: user.email, error: emailResult.error }, 'Failed to send magic link email');
      }
    } catch (emailError) {
      logger.error({ userId: user._id, email: user.email, error: emailError }, 'Error sending magic link email');
    }
    
    logger.info({ userId: user._id, email: user.email }, 'Magic link requested');
    
    // Send success response
    res.json({
      success: true,
      message: 'Magic link sent to your email address'
    });
    
  } catch (error) {
    logger.error({ error }, 'Magic link request error');
    res.status(500).json({
      error: 'Request failed',
      message: 'An error occurred while processing your request'
    });
  }
}

export async function magicLinkLogin(req: Request, res: Response): Promise<void> {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      res.status(400).json({
        error: 'Invalid token',
        message: 'Token is required'
      });
      return;
    }
    
    const user = await User.findOne({
      magicLinkToken: token,
      magicLinkExpiresAt: { $gt: new Date() }
    });
    
    if (!user) {
      res.status(401).json({
        error: 'Invalid or expired token',
        message: 'The magic link is invalid or has expired'
      });
      return;
    }
    
    // Clear magic link token
    user.magicLinkToken = undefined;
    user.magicLinkExpiresAt = undefined;
    user.emailVerified = true;
    user.lastLoginAt = new Date();
    await user.save();
    
    // Generate JWT token
    const jwtToken = generateJWT({
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    });
    
    logger.info({ userId: user._id, email: user.email }, 'User logged in via magic link');
    
    res.json({
      success: true,
      message: 'Login successful',
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        bio: user.bio,
        avatar: user.avatar,
        location: user.location,
        socialLinks: user.socialLinks,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    logger.error({ error }, 'Magic link login error');
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    // Validate input
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        error: 'Missing fields',
        message: 'Current password and new password are required'
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        error: 'Weak password',
        message: 'New password must be at least 6 characters long'
      });
      return;
    }

    // Find user with password
    const user = await User.findById(req.user.userId).select('+passwordHash');
    
    if (!user || !user.passwordHash) {
      res.status(404).json({
        error: 'User not found',
        message: 'User not found or no password set'
      });
      return;
    }

    // Verify current password
    const { comparePassword, hashPassword } = await import('../utils/auth');
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        error: 'Invalid password',
        message: 'Current password is incorrect'
      });
      return;
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update password
    user.passwordHash = newPasswordHash;
    await user.save();

    logger.info({ userId: user._id }, 'Password changed successfully');

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error({ error }, 'Change password error');
    res.status(500).json({
      error: 'Failed to change password',
      message: 'An error occurred while changing password'
    });
  }
}