/**
 * Authentication Helper for Tests
 * Utilities for managing authentication in tests
 */

import request from 'supertest';
import { testConfig, getTestUser } from '../config/test-env';

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Login and get authentication token
 */
export async function loginUser(
  app: any,
  email?: string,
  password?: string
): Promise<AuthResponse> {
  const credentials = email && password 
    ? { email, password }
    : getTestUser('student');

  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: credentials.email,
      password: credentials.password,
    })
    .expect(200);

  return response.body;
}

/**
 * Login as admin
 */
export async function loginAsAdmin(app: any): Promise<AuthResponse> {
  const admin = getTestUser('admin');
  return loginUser(app, admin.email, admin.password);
}

/**
 * Login as student
 */
export async function loginAsStudent(app: any): Promise<AuthResponse> {
  const student = getTestUser('student');
  return loginUser(app, student.email, student.password);
}

/**
 * Login as mentor
 */
export async function loginAsMentor(app: any): Promise<AuthResponse> {
  const mentor = getTestUser('mentor');
  return loginUser(app, mentor.email, mentor.password);
}

/**
 * Create authenticated request
 * Returns a supertest request with auth header
 */
export function authenticatedRequest(
  app: any,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  token: string
) {
  return request(app)[method](path).set('Authorization', `Bearer ${token}`);
}

/**
 * Helper to create and login a new user
 */
export async function createAndLoginUser(app: any, userData = {}): Promise<{
  user: any;
  token: string;
}> {
  // First create the user
  const defaultData = {
    email: `test${Date.now()}@example.com`,
    password: 'TestPass123!',
    name: 'Test User',
    ...userData,
  };

  const signupResponse = await request(app)
    .post('/api/v1/auth/signup')
    .send(defaultData)
    .expect(201);

  // Then login
  const loginResponse = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: defaultData.email,
      password: defaultData.password,
    })
    .expect(200);

  return {
    user: signupResponse.body.user,
    token: loginResponse.body.token,
  };
}

/**
 * Request password reset
 */
export async function requestPasswordReset(app: any, email: string): Promise<void> {
  await request(app)
    .post('/api/v1/auth/forgot-password')
    .send({ email })
    .expect(200);
}

/**
 * Verify email with token
 */
export async function verifyEmail(app: any, token: string): Promise<void> {
  await request(app)
    .get(`/api/v1/auth/verify-email?token=${token}`)
    .expect(200);
}

/**
 * Logout user
 */
export async function logoutUser(app: any, token: string): Promise<void> {
  await request(app)
    .post('/api/v1/auth/logout')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
}

/**
 * Get current user profile
 */
export async function getCurrentUser(app: any, token: string): Promise<any> {
  const response = await request(app)
    .get('/api/v1/users/me')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  return response.body;
}

/**
 * Helper to generate magic link token (for testing)
 */
export function generateMagicLinkToken(email: string): string {
  // This is a simplified version for testing
  // In real implementation, this would use proper JWT signing
  return Buffer.from(JSON.stringify({ email, timestamp: Date.now() })).toString('base64');
}

/**
 * Test unauthorized access
 * Helper to verify endpoints require authentication
 */
export async function testUnauthorizedAccess(
  app: any,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string
): Promise<void> {
  await request(app)[method](path).expect(401);
}

/**
 * Test role-based access
 * Helper to verify endpoints require specific roles
 */
export async function testRoleAccess(
  app: any,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  allowedRoles: string[],
  deniedRoles: string[]
): Promise<void> {
  // Test allowed roles
  for (const role of allowedRoles) {
    const user = getTestUser(role as any);
    const { token } = await loginUser(app, user.email, user.password);
    await authenticatedRequest(app, method, path, token).expect(200);
  }

  // Test denied roles
  for (const role of deniedRoles) {
    const user = getTestUser(role as any);
    const { token } = await loginUser(app, user.email, user.password);
    await authenticatedRequest(app, method, path, token).expect(403);
  }
}

/**
 * Extract cookies from response
 */
export function extractCookies(response: any): { [key: string]: string } {
  const cookies: { [key: string]: string } = {};
  const setCookieHeader = response.headers['set-cookie'];
  
  if (setCookieHeader) {
    setCookieHeader.forEach((cookie: string) => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      cookies[name] = value;
    });
  }
  
  return cookies;
}