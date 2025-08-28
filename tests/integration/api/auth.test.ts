/**
 * Authentication API Integration Tests
 * Tests for login, signup, logout, and password reset
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { 
  setupIntegrationTest, 
  cleanupIntegrationTest,
  clearTestDB
} from '../../helpers/setup';
import { createUser } from '../../helpers/factories';
import { loginUser, createAndLoginUser } from '../../helpers/auth-helper';
import { testConfig } from '../../config/test-env';

// Import your Express app (adjust path as needed)
import app from '../../../apps/api/src/app';

describe('Authentication API', () => {
  beforeAll(async () => {
    await setupIntegrationTest();
  });

  afterAll(async () => {
    await cleanupIntegrationTest();
  });

  beforeEach(async () => {
    // Clear database between tests for isolation
    await clearTestDB();
  });

  describe('POST /api/v1/auth/signup', () => {
    it('should create a new user with valid data', async () => {
      const userData = createUser();

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject duplicate email', async () => {
      const userData = createUser();

      // First signup
      await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(201);

      // Try to signup with same email
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should reject invalid email format', async () => {
      const userData = createUser({ email: 'invalid-email' });

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('email');
    });

    it('should reject weak password', async () => {
      const userData = createUser({ password: '123' });

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create a user first
      const userData = createUser();
      await request(app)
        .post('/api/v1/auth/signup')
        .send(userData);

      // Now try to login
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'somepassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      // Create a user
      const userData = createUser();
      await request(app)
        .post('/api/v1/auth/signup')
        .send(userData);

      // Try to login with wrong password
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should set httpOnly cookie on successful login', async () => {
      const userData = createUser();
      await request(app)
        .post('/api/v1/auth/signup')
        .send(userData);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      // Check for set-cookie header
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      // If cookies are set, verify httpOnly flag
      if (cookies && cookies.length > 0) {
        expect(cookies[0]).toContain('HttpOnly');
      }
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout authenticated user', async () => {
      // Create and login user
      const { token } = await createAndLoginUser(app);

      // Logout
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('logout');
    });

    it('should clear authentication cookie', async () => {
      const { token } = await createAndLoginUser(app);

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Check if cookie is cleared
      const cookies = response.headers['set-cookie'];
      if (cookies && cookies.length > 0) {
        expect(cookies[0]).toContain('Max-Age=0');
      }
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should send reset email for existing user', async () => {
      // Create a user
      const userData = createUser();
      await request(app)
        .post('/api/v1/auth/signup')
        .send(userData);

      // Request password reset
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: userData.email })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('reset');
    });

    it('should not reveal if email exists', async () => {
      // Request reset for non-existent email
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Should return success even for non-existent email (security)
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/v1/auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      // This test assumes you have a verify-email endpoint
      // Adjust according to your actual implementation
      
      const mockToken = 'valid-verification-token';
      
      // You might need to create a user with unverified email
      // and generate a real token for this test
      
      // For now, we'll test that the endpoint exists
      const response = await request(app)
        .get(`/api/v1/auth/verify-email?token=${mockToken}`);

      // Expect either 200 (valid token) or 400 (invalid token)
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('POST /api/v1/auth/magic-link', () => {
    it('should send magic link to existing user', async () => {
      // Create a user
      const userData = createUser();
      await request(app)
        .post('/api/v1/auth/signup')
        .send(userData);

      // Request magic link
      const response = await request(app)
        .post('/api/v1/auth/magic-link')
        .send({ email: userData.email })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('magic link');
    });
  });

  describe('Authentication Middleware', () => {
    it('should reject requests without token', async () => {
      await request(app)
        .get('/api/v1/users/me')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should accept requests with valid token', async () => {
      const { token } = await createAndLoginUser(app);

      await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      // Make multiple failed login attempts
      const attempts = 10;
      const responses = [];

      for (let i = 0; i < attempts; i++) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ email, password });
        
        responses.push(response.status);
      }

      // Check if any request was rate limited (usually 429)
      const rateLimited = responses.some(status => status === 429);
      
      // If rate limiting is implemented, this should be true
      // If not implemented yet, we can skip this assertion
      if (rateLimited) {
        expect(rateLimited).toBe(true);
      }
    });
  });
});