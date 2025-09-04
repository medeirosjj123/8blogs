import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, validatePassword, validateEmail } from '../utils/auth';

describe('Auth Utils', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await comparePassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      const isValid = await comparePassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('should validate strong password', () => {
      const result = validatePassword('StrongPass123!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short password', () => {
      const result = validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without number', () => {
      const result = validatePassword('NoNumber!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('nouppercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = validatePassword('NOLOWERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.org')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user@.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });
});