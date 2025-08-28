import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import { generateJWT } from '../utils/auth';
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

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback'
);

export async function googleAuth(req: Request, res: Response): Promise<void> {
  try {
    const authorizeUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback'
    });
    
    res.redirect(authorizeUrl);
  } catch (error) {
    logger.error({ error }, 'Google OAuth initiation error');
    res.status(500).json({
      error: 'OAuth failed',
      message: 'Failed to initiate Google OAuth'
    });
  }
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.query;
    
    if (!code || typeof code !== 'string') {
      res.status(400).json({
        error: 'Missing code',
        message: 'Authorization code is required'
      });
      return;
    }
    
    // Exchange code for tokens
    const { tokens } = await client.getToken({
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback'
    });
    
    if (!tokens.id_token) {
      res.status(400).json({
        error: 'Invalid response',
        message: 'No ID token received from Google'
      });
      return;
    }
    
    // Verify and decode the ID token
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID!
    });
    
    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
      res.status(400).json({
        error: 'Invalid token',
        message: 'Could not extract user information from token'
      });
      return;
    }
    
    // Find or create user
    let user = await User.findOne({ email: payload.email.toLowerCase() });
    
    if (!user) {
      // Create new user
      user = new User({
        email: payload.email.toLowerCase(),
        name: payload.name || payload.email.split('@')[0],
        emailVerified: payload.email_verified || false,
        role: 'aluno',
        // No password for OAuth users
      });
      
      await user.save();
      logger.info({ userId: user._id, email: user.email }, 'New user created via Google OAuth');
    } else {
      // Update user info if needed
      if (!user.emailVerified && payload.email_verified) {
        user.emailVerified = true;
      }
      if (payload.name && !user.name) {
        user.name = payload.name;
      }
      user.lastLoginAt = new Date();
      await user.save();
      logger.info({ userId: user._id, email: user.email }, 'User logged in via Google OAuth');
    }
    
    // Generate JWT token
    const token = generateJWT({
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    });
    
    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (error) {
    logger.error({ error }, 'Google OAuth callback error');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
}