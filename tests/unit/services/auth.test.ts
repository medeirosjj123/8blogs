/**
 * Unit Tests: Authentication Service
 * Tests JWT generation, password hashing, magic links, and token validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hashPassword,
  comparePassword,
  generateSecureToken,
  generateMagicLinkToken,
  generateJWT,
  verifyJWT,
  type JWTPayload
} from '@/utils/auth';

describe('Authentication Utils', () => {
  beforeEach(() => {
    // Ensure JWT_SECRET is set for tests
    process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_very_secure';
  });

  describe('Password Hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeTruthy();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
      expect(hashedPassword).toMatch(/^\$2[aby]?\$\d{1,2}\$/);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await hashPassword(password);
      const isValid = await comparePassword(password, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hashedPassword = await hashPassword(password);
      const isValid = await comparePassword(wrongPassword, hashedPassword);
      
      expect(isValid).toBe(false);
    });

    it('should handle empty passwords', async () => {
      await expect(hashPassword('')).rejects.toThrow();
    });
  });

  describe('Token Generation', () => {
    it('should generate secure random token', () => {
      const token = generateSecureToken();
      
      expect(token).toBeTruthy();
      expect(token.length).toBe(64); // 32 bytes in hex
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate different tokens each time', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should generate magic link token with expiry', () => {
      const beforeTime = new Date();
      const magicLink = generateMagicLinkToken();
      const afterTime = new Date(Date.now() + 16 * 60 * 1000); // 16 minutes from now
      
      expect(magicLink.token).toBeTruthy();
      expect(magicLink.token.length).toBe(64);
      expect(magicLink.expiresAt).toBeInstanceOf(Date);
      expect(magicLink.expiresAt.getTime()).toBeGreaterThan(beforeTime.getTime());
      expect(magicLink.expiresAt.getTime()).toBeLessThan(afterTime.getTime());
    });
  });

  describe('JWT Operations', () => {
    const testPayload: JWTPayload = {
      userId: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      role: 'aluno'
    };

    it('should generate valid JWT token', () => {
      const token = generateJWT(testPayload);
      
      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3); // Header.Payload.Signature
    });

    it('should verify and decode JWT token', () => {
      const token = generateJWT(testPayload);
      const decoded = verifyJWT(token);
      
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.iss).toBe('tatame-api');
    });

    it('should include expiration time', () => {
      const beforeTime = Math.floor(Date.now() / 1000);
      const token = generateJWT(testPayload);
      const decoded = verifyJWT(token) as any;
      
      expect(decoded.exp).toBeTruthy();
      expect(decoded.exp).toBeGreaterThan(beforeTime);
      expect(decoded.iat).toBeTruthy();
      expect(decoded.iat).toBeGreaterThanOrEqual(beforeTime);
    });

    it('should throw error for invalid JWT token', () => {
      expect(() => verifyJWT('invalid.jwt.token')).toThrow();
      expect(() => verifyJWT('definitely-not-a-jwt')).toThrow();
      expect(() => verifyJWT('')).toThrow();
    });

    it('should throw error for expired token', () => {
      // Mock Date.now to create an expired token
      const originalNow = Date.now;
      const pastTime = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
      
      vi.spyOn(Date, 'now').mockReturnValue(pastTime);
      const expiredToken = generateJWT(testPayload);
      
      Date.now = originalNow;
      
      expect(() => verifyJWT(expiredToken)).toThrow();
    });

    it('should throw error when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      
      expect(() => generateJWT(testPayload)).toThrow('JWT_SECRET is not defined');
      expect(() => verifyJWT('any.jwt.token')).toThrow('JWT_SECRET is not defined');
      
      // Restore for other tests
      process.env.JWT_SECRET = 'test_jwt_secret_for_unit_tests_very_secure';
    });

    it('should handle different user roles', () => {
      const roles = ['aluno', 'mentor', 'admin'];
      
      roles.forEach(role => {
        const payload = { ...testPayload, role };
        const token = generateJWT(payload);
        const decoded = verifyJWT(token);
        
        expect(decoded.role).toBe(role);
      });
    });

    it('should handle different payload data', () => {
      const payloads = [
        {
          userId: '507f1f77bcf86cd799439011',
          email: 'admin@example.com',
          role: 'admin'
        },
        {
          userId: '507f1f77bcf86cd799439012',
          email: 'mentor@example.com',
          role: 'mentor'
        }
      ];
      
      payloads.forEach(payload => {
        const token = generateJWT(payload);
        const decoded = verifyJWT(token);
        
        expect(decoded.userId).toBe(payload.userId);
        expect(decoded.email).toBe(payload.email);
        expect(decoded.role).toBe(payload.role);
      });
    });
  });

  describe('Security Considerations', () => {
    it('should generate cryptographically secure tokens', () => {
      const tokens = new Set();
      const iterations = 1000;
      
      // Generate many tokens to check for patterns/duplicates
      for (let i = 0; i < iterations; i++) {
        tokens.add(generateSecureToken());
      }
      
      expect(tokens.size).toBe(iterations); // All tokens should be unique
    });

    it('should use sufficient hash rounds for security', async () => {
      const password = 'TestPassword123!';
      const startTime = Date.now();
      await hashPassword(password);
      const endTime = Date.now();
      
      // Hashing should take some time (indicating sufficient rounds)
      expect(endTime - startTime).toBeGreaterThan(10); // At least 10ms
    });

    it('should handle malformed JWT tokens gracefully', () => {
      const malformedTokens = [
        'not.a.jwt',
        'header.payload', // Missing signature
        'header..signature', // Empty payload
        'header.invalid_json.signature',
        null,
        undefined,
        123,
        {}
      ];
      
      malformedTokens.forEach(token => {
        expect(() => verifyJWT(token as any)).toThrow();
      });
    });

    it('should not accept tokens with wrong signature', () => {
      const token = generateJWT(testPayload);
      const parts = token.split('.');
      const modifiedToken = parts[0] + '.' + parts[1] + '.wrong_signature';
      
      expect(() => verifyJWT(modifiedToken)).toThrow();
    });

    it('should not accept tokens with modified payload', () => {
      const token = generateJWT(testPayload);
      const parts = token.split('.');
      
      // Create a modified payload
      const modifiedPayload = Buffer.from(JSON.stringify({
        ...testPayload,
        role: 'admin' // Trying to elevate privileges
      })).toString('base64url');
      
      const modifiedToken = parts[0] + '.' + modifiedPayload + '.' + parts[2];
      
      expect(() => verifyJWT(modifiedToken)).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const hashedPassword = await hashPassword(longPassword);
      const isValid = await comparePassword(longPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should handle passwords with special characters', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const hashedPassword = await hashPassword(specialPassword);
      const isValid = await comparePassword(specialPassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should handle unicode characters in password', async () => {
      const unicodePassword = '🔐🚀🎯💯测试密码';
      const hashedPassword = await hashPassword(unicodePassword);
      const isValid = await comparePassword(unicodePassword, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should handle empty or null values gracefully', async () => {
      await expect(comparePassword('', '')).resolves.toBe(false);
      await expect(comparePassword('test', '')).resolves.toBe(false);
      await expect(comparePassword('', 'hash')).resolves.toBe(false);
    });

    it('should handle very long email addresses in JWT', () => {
      const longEmail = 'a'.repeat(100) + '@' + 'b'.repeat(100) + '.com';
      const payload = {
        ...testPayload,
        email: longEmail
      };
      
      const token = generateJWT(payload);
      const decoded = verifyJWT(token);
      
      expect(decoded.email).toBe(longEmail);
    });
  });
});