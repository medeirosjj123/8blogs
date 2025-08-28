/**
 * Integration Test: User Management API Endpoints
 * Tests user CRUD operations, authentication, and authorization
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '@/index';
import { User } from '@/models/User';
import { Membership } from '@/models/Membership';
import { connectDatabase, closeDatabaseConnection, createTestUser, createTestAdmin } from '@tests/helpers/setup';
import { generateJWT } from '@/utils/auth';

describe('User Management API Integration Tests', () => {
  let adminToken: string;
  let userToken: string;
  let testUser: any;
  let testAdmin: any;

  beforeAll(async () => {
    await connectDatabase();
    
    // Create test admin and user
    testAdmin = await createTestAdmin();
    testUser = await createTestUser();
    
    adminToken = generateJWT({
      userId: testAdmin._id.toString(),
      email: testAdmin.email,
      role: testAdmin.role
    });
    
    userToken = generateJWT({
      userId: testUser._id.toString(),
      email: testUser.email,
      role: testUser.role
    });
  });

  afterAll(async () => {
    await closeDatabaseConnection();
  });

  beforeEach(async () => {
    // Clean up any test users created during tests
    await User.deleteMany({ 
      email: { $regex: /^test-.*@example\.com$/ }
    });
    await Membership.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register new user successfully', async () => {
      const newUser = {
        name: 'New Test User',
        email: 'new-user@example.com',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(newUser.email);
      expect(response.body.data.user.name).toBe(newUser.name);
      expect(response.body.data.user.role).toBe('aluno');
      expect(response.body.data.token).toBeTruthy();

      // Password should not be returned
      expect(response.body.data.user.password).toBeUndefined();

      // User should be created in database
      const dbUser = await User.findOne({ email: newUser.email });
      expect(dbUser).toBeTruthy();
      expect(dbUser?.emailVerified).toBe(false); // Should require verification
    });

    it('should reject duplicate email registration', async () => {
      const duplicateUser = {
        name: 'Duplicate User',
        email: testUser.email,
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email');
    });

    it('should validate required fields', async () => {
      const invalidUser = {
        name: '',
        email: 'invalid-email',
        password: '123' // Too short
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeTruthy();
    });

    it('should validate email format', async () => {
      const invalidEmailUser = {
        name: 'Test User',
        email: 'not-an-email',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidEmailUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate password strength', async () => {
      const weakPasswordUser = {
        name: 'Test User',
        email: 'weak-password@example.com',
        password: '123456' // Too weak
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('password');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.token).toBeTruthy();
      
      // Should not return password
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should reject invalid credentials', async () => {
      const invalidLogin = {
        email: testUser.email,
        password: 'WrongPassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidLogin);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const nonExistentLogin = {
        email: 'nonexistent@example.com',
        password: 'AnyPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(nonExistentLogin);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject empty credentials', async () => {
      const emptyLogin = {
        email: '',
        password: ''
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(emptyLogin);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/users/profile', () => {
    it('should return user profile when authenticated', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.name).toBe(testUser.name);
      expect(response.body.data.password).toBeUndefined();
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('should update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        bio: 'Updated bio'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.bio).toBe('Updated bio');

      // Verify in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.name).toBe('Updated Name');
      expect(updatedUser?.bio).toBe('Updated bio');
    });

    it('should not allow email update through profile', async () => {
      const updateData = {
        email: 'hacker@example.com',
        name: 'Hacker'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      // Should succeed but ignore email change
      expect(response.status).toBe(200);
      
      const user = await User.findById(testUser._id);
      expect(user?.email).toBe(testUser.email); // Email unchanged
      expect(user?.name).toBe('Hacker'); // Name updated
    });

    it('should validate profile data', async () => {
      const invalidData = {
        name: '', // Empty name
        website: 'not-a-url'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/magic-link', () => {
    it('should generate magic link for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/magic-link')
        .send({ email: testUser.email });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('enviado');

      // Verify magic link token was set
      const user = await User.findById(testUser._id);
      expect(user?.magicLinkToken).toBeTruthy();
      expect(user?.magicLinkExpiresAt).toBeInstanceOf(Date);
      expect(user?.magicLinkExpiresAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reject magic link for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/magic-link')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/magic-link')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/magic-link/verify', () => {
    it('should verify valid magic link token', async () => {
      // First generate a magic link
      await request(app)
        .post('/api/auth/magic-link')
        .send({ email: testUser.email });

      const user = await User.findById(testUser._id);
      const magicToken = user?.magicLinkToken;

      // Now verify the token
      const response = await request(app)
        .post('/api/auth/magic-link/verify')
        .send({ token: magicToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeTruthy();
      expect(response.body.data.user.email).toBe(testUser.email);

      // Magic link token should be cleared after use
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.magicLinkToken).toBeFalsy();
    });

    it('should reject invalid magic link token', async () => {
      const response = await request(app)
        .post('/api/auth/magic-link/verify')
        .send({ token: 'invalid_token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject expired magic link token', async () => {
      // Create user with expired token
      const expiredUser = await User.create({
        name: 'Expired User',
        email: 'expired@example.com',
        password: 'hashedpassword',
        magicLinkToken: 'expired_token',
        magicLinkExpiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      });

      const response = await request(app)
        .post('/api/auth/magic-link/verify')
        .send({ token: 'expired_token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('expired');
    });
  });

  describe('Admin User Management', () => {
    describe('GET /api/admin/users', () => {
      it('should allow admin to list users', async () => {
        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });

      it('should reject non-admin access', async () => {
        const response = await request(app)
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/admin/users?page=1&limit=10')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.pagination).toBeTruthy();
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(10);
      });

      it('should support search by email', async () => {
        const response = await request(app)
          .get(`/api/admin/users?email=${testUser.email}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].email).toBe(testUser.email);
      });
    });

    describe('PUT /api/admin/users/:id', () => {
      it('should allow admin to update user', async () => {
        const updateData = {
          name: 'Admin Updated Name',
          role: 'mentor'
        };

        const response = await request(app)
          .put(`/api/admin/users/${testUser._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Admin Updated Name');
        expect(response.body.data.role).toBe('mentor');
      });

      it('should reject non-admin user updates', async () => {
        const response = await request(app)
          .put(`/api/admin/users/${testUser._id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ name: 'Hacker Update' });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });

      it('should validate user ID format', async () => {
        const response = await request(app)
          .put('/api/admin/users/invalid-id')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Test' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/admin/users/:id', () => {
      it('should allow admin to delete user', async () => {
        // Create a user to delete
        const userToDelete = await User.create({
          name: 'User To Delete',
          email: 'delete-me@example.com',
          password: 'hashedpassword'
        });

        const response = await request(app)
          .delete(`/api/admin/users/${userToDelete._id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // User should be deleted from database
        const deletedUser = await User.findById(userToDelete._id);
        expect(deletedUser).toBeFalsy();
      });

      it('should reject non-admin user deletion', async () => {
        const response = await request(app)
          .delete(`/api/admin/users/${testUser._id}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
      });

      it('should prevent admin from deleting themselves', async () => {
        const response = await request(app)
          .delete(`/api/admin/users/${testAdmin._id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('yourself');
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const loginData = {
        email: testUser.email,
        password: 'WrongPassword'
      };

      // Make multiple failed login attempts
      const promises = Array.from({ length: 6 }, () =>
        request(app).post('/api/auth/login').send(loginData)
      );

      const responses = await Promise.all(promises);

      // Last requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should rate limit registration attempts', async () => {
      // Make multiple registration attempts from same IP
      const promises = Array.from({ length: 6 }, (_, i) =>
        request(app).post('/api/auth/register').send({
          name: `Test User ${i}`,
          email: `test${i}@example.com`,
          password: 'TestPassword123!'
        })
      );

      const responses = await Promise.all(promises);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});