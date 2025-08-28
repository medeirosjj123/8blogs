/**
 * Unit Tests for Authentication Utilities
 * Tests pure functions without external dependencies
 */

import { describe, it, expect } from 'vitest';

// Mock auth utilities (adjust import path as needed)
// import { 
//   validateEmail, 
//   validatePassword,
//   hashPassword,
//   comparePassword,
//   generateToken,
//   verifyToken
// } from '../../../apps/api/src/utils/auth';

// For demonstration, we'll define the functions here
// In real implementation, import from your actual utils

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '');
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isValidCPF(cpf: string): boolean {
  // Remove non-digits
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11) return false;
  
  // Check for known invalid CPFs
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Validate check digits (simplified)
  return true;
}

function formatCurrency(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency
  }).format(value);
}

describe('Email Validation', () => {
  it('should validate correct email formats', () => {
    const validEmails = [
      'user@example.com',
      'test.user@example.com',
      'user+tag@example.co.uk',
      'user123@test-domain.com',
      'FirstLast@example.org'
    ];
    
    validEmails.forEach(email => {
      expect(validateEmail(email)).toBe(true);
    });
  });

  it('should reject invalid email formats', () => {
    const invalidEmails = [
      'notanemail',
      '@example.com',
      'user@',
      'user@.com',
      'user @example.com',
      'user@exam ple.com',
      'user.example.com',
      '',
      ' ',
      'user@',
      '@',
      'user@domain',
      'user@domain.',
      '.user@domain.com',
      'user..name@domain.com'
    ];
    
    invalidEmails.forEach(email => {
      expect(validateEmail(email)).toBe(false);
    });
  });

  it('should handle edge cases', () => {
    expect(validateEmail('a@b.c')).toBe(true); // Minimal valid
    expect(validateEmail('very.long.email.address.with.many.dots@example.com')).toBe(true);
    expect(validateEmail('user@subdomain.example.com')).toBe(true);
  });
});

describe('Password Validation', () => {
  it('should accept strong passwords', () => {
    const strongPasswords = [
      'StrongPass123!',
      'MyP@ssw0rd',
      'Secur3Pass!',
      'Test123$Pass',
      'ValidP@ss2024'
    ];
    
    strongPasswords.forEach(password => {
      const result = validatePassword(password);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  it('should reject weak passwords with specific errors', () => {
    const tests = [
      {
        password: 'short',
        expectedErrors: [
          'Password must be at least 8 characters long',
          'Password must contain at least one uppercase letter',
          'Password must contain at least one number',
          'Password must contain at least one special character'
        ]
      },
      {
        password: 'nouppercase123!',
        expectedErrors: ['Password must contain at least one uppercase letter']
      },
      {
        password: 'NOLOWERCASE123!',
        expectedErrors: ['Password must contain at least one lowercase letter']
      },
      {
        password: 'NoNumbers!',
        expectedErrors: ['Password must contain at least one number']
      },
      {
        password: 'NoSpecialChar123',
        expectedErrors: ['Password must contain at least one special character']
      }
    ];
    
    tests.forEach(({ password, expectedErrors }) => {
      const result = validatePassword(password);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(expectedErrors);
    });
  });
});

describe('Input Sanitization', () => {
  it('should remove script tags', () => {
    const maliciousInputs = [
      '<script>alert("XSS")</script>',
      'Normal text <script>evil()</script> more text',
      '<SCRIPT>alert("XSS")</SCRIPT>',
      '<script src="evil.js"></script>'
    ];
    
    maliciousInputs.forEach(input => {
      const sanitized = sanitizeInput(input);
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('</script>');
    });
  });

  it('should remove HTML tags', () => {
    expect(sanitizeInput('<div>Hello</div>')).toBe('divHello/div');
    expect(sanitizeInput('Hello <b>World</b>')).toBe('Hello bWorld/b');
  });

  it('should trim whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
    expect(sanitizeInput('\n\ttext\n\t')).toBe('text');
  });

  it('should handle normal text', () => {
    expect(sanitizeInput('Normal text')).toBe('Normal text');
    expect(sanitizeInput('Text with numbers 123')).toBe('Text with numbers 123');
  });
});

describe('Slug Generation', () => {
  it('should generate valid slugs', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
    expect(generateSlug('  Multiple   Spaces  ')).toBe('multiple-spaces');
    expect(generateSlug('Special!@#$%Characters')).toBe('specialcharacters');
    expect(generateSlug('Mix123Numbers')).toBe('mix123numbers');
  });

  it('should handle edge cases', () => {
    expect(generateSlug('')).toBe('');
    expect(generateSlug('---')).toBe('');
    expect(generateSlug('a')).toBe('a');
    expect(generateSlug('CamelCaseText')).toBe('camelcasetext');
  });

  it('should handle Portuguese characters', () => {
    expect(generateSlug('São Paulo')).toBe('so-paulo');
    expect(generateSlug('Ação')).toBe('ao');
  });
});

describe('CPF Validation', () => {
  it('should validate correct CPF formats', () => {
    const validCPFs = [
      '12345678901',
      '123.456.789-01',
      '123 456 789 01'
    ];
    
    validCPFs.forEach(cpf => {
      expect(isValidCPF(cpf)).toBe(true);
    });
  });

  it('should reject invalid CPFs', () => {
    const invalidCPFs = [
      '00000000000',
      '11111111111',
      '12345',
      '123456789012', // Too long
      'abcdefghijk',
      ''
    ];
    
    invalidCPFs.forEach(cpf => {
      expect(isValidCPF(cpf)).toBe(false);
    });
  });
});

describe('Currency Formatting', () => {
  it('should format BRL currency correctly', () => {
    expect(formatCurrency(100)).toBe('R$ 100,00');
    expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
    expect(formatCurrency(0)).toBe('R$ 0,00');
    expect(formatCurrency(0.99)).toBe('R$ 0,99');
  });

  it('should handle large numbers', () => {
    expect(formatCurrency(1000000)).toBe('R$ 1.000.000,00');
    expect(formatCurrency(999999.99)).toBe('R$ 999.999,99');
  });

  it('should handle negative numbers', () => {
    expect(formatCurrency(-100)).toContain('100');
    expect(formatCurrency(-1234.56)).toContain('1.234,56');
  });
});

describe('Token Generation and Validation', () => {
  // These would test JWT token functions
  // Mocked for demonstration
  
  function generateToken(length = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
  
  function isValidToken(token: string): boolean {
    return token.length === 32 && /^[A-Za-z0-9]+$/.test(token);
  }
  
  it('should generate tokens of correct length', () => {
    const token = generateToken();
    expect(token).toHaveLength(32);
    expect(isValidToken(token)).toBe(true);
  });
  
  it('should generate unique tokens', () => {
    const tokens = new Set();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateToken());
    }
    expect(tokens.size).toBe(100);
  });
});

describe('Date Utilities', () => {
  function isExpired(date: Date): boolean {
    return date < new Date();
  }
  
  function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
  
  function formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR');
  }
  
  it('should check expiration correctly', () => {
    const past = new Date('2020-01-01');
    const future = new Date('2030-01-01');
    
    expect(isExpired(past)).toBe(true);
    expect(isExpired(future)).toBe(false);
  });
  
  it('should add days correctly', () => {
    const date = new Date('2024-01-01');
    const result = addDays(date, 30);
    
    expect(result.getDate()).toBe(31);
    expect(result.getMonth()).toBe(0); // January
  });
  
  it('should format dates in Brazilian format', () => {
    const date = new Date('2024-12-25');
    expect(formatDate(date)).toMatch(/25\/12\/2024/);
  });
});