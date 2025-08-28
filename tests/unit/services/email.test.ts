/**
 * Unit Tests: Email Service
 * Tests email providers, template rendering, and service initialization
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { emailService } from '@/services/email.service';
import { Settings } from '@/models/Settings';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock Settings model
vi.mock('@/models/Settings', () => ({
  Settings: {
    getSetting: vi.fn()
  }
}));

describe('Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set default environment variables
    process.env.FRONTEND_URL = 'http://localhost:5173';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize with ElasticEmail provider', async () => {
      (Settings.getSetting as Mock)
        .mockResolvedValueOnce('elasticemail') // provider
        .mockResolvedValueOnce('test_api_key') // apiKey
        .mockResolvedValueOnce('test@example.com') // fromEmail
        .mockResolvedValueOnce('Test Sender'); // fromName

      // Mock successful connection test
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { email: 'test@example.com' } })
      });

      await emailService.initialize();

      expect(Settings.getSetting).toHaveBeenCalledWith('email', 'provider');
      expect(Settings.getSetting).toHaveBeenCalledWith('email', 'apiKey');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.elasticemail.com/v2/account/load',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
      );
    });

    it('should initialize with Brevo provider', async () => {
      (Settings.getSetting as Mock)
        .mockResolvedValueOnce('brevo') // provider
        .mockResolvedValueOnce('test_brevo_key') // apiKey
        .mockResolvedValueOnce('test@example.com') // fromEmail
        .mockResolvedValueOnce('Test Sender'); // fromName

      // Mock successful connection test
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ email: 'test@example.com' })
      });

      await emailService.initialize();

      expect(fetch).toHaveBeenCalledWith(
        'https://api.brevo.com/v3/account',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'api-key': 'test_brevo_key'
          }
        })
      );
    });

    it('should handle missing configuration gracefully', async () => {
      (Settings.getSetting as Mock)
        .mockResolvedValueOnce(null) // provider
        .mockResolvedValueOnce(null) // apiKey
        .mockResolvedValueOnce(null); // fromEmail

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await emailService.initialize();

      expect(consoleSpy).toHaveBeenCalledWith('Email service not configured');
    });

    it('should handle connection test failure', async () => {
      (Settings.getSetting as Mock)
        .mockResolvedValueOnce('elasticemail')
        .mockResolvedValueOnce('invalid_key')
        .mockResolvedValueOnce('test@example.com')
        .mockResolvedValueOnce('Test Sender');

      // Mock failed connection test
      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid API key' })
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await emailService.initialize();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to initialize email service: Invalid API key');
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Continuing with email provider despite connection test failure');
    });
  });

  describe('Email Sending', () => {
    beforeEach(async () => {
      // Initialize service with ElasticEmail
      (Settings.getSetting as Mock)
        .mockResolvedValueOnce('elasticemail')
        .mockResolvedValueOnce('test_api_key')
        .mockResolvedValueOnce('noreply@example.com')
        .mockResolvedValueOnce('Test Service');

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await emailService.initialize();
      vi.clearAllMocks();
    });

    it('should send welcome email successfully', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          data: { messageid: 'msg123' }
        })
      });

      const result = await emailService.sendWelcomeEmail('user@example.com', 'Test User');

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.elasticemail.com/v2/email/send',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
      );

      // Check that the request body contains expected fields
      const call = (fetch as Mock).mock.calls[0];
      const body = call[1].body;
      expect(body).toContain('to=user%40example.com');
      expect(body).toContain('subject=Bem-vindo');
      expect(body).toContain('bodyHtml=');
    });

    it('should send magic link email successfully', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          data: { messageid: 'msg124' }
        })
      });

      const result = await emailService.sendMagicLinkEmail(
        'user@example.com', 
        'magic_token_123', 
        'Test User'
      );

      expect(result.success).toBe(true);
      
      const call = (fetch as Mock).mock.calls[0];
      const body = call[1].body;
      expect(body).toContain('magic_token_123');
      expect(body).toContain('subject=Acesso%20R%C3%A1pido');
    });

    it('should send password reset email successfully', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          data: { messageid: 'msg125' }
        })
      });

      const result = await emailService.sendPasswordResetEmail(
        'user@example.com', 
        'reset_token_123', 
        'Test User'
      );

      expect(result.success).toBe(true);
      
      const call = (fetch as Mock).mock.calls[0];
      const body = call[1].body;
      expect(body).toContain('reset_token_123');
      expect(body).toContain('subject=Redefinir%20Senha');
    });

    it('should send test email successfully', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          data: { messageid: 'msg126' }
        })
      });

      const result = await emailService.sendTestEmail('admin@example.com');

      expect(result.success).toBe(true);
      
      const call = (fetch as Mock).mock.calls[0];
      const body = call[1].body;
      expect(body).toContain('to=admin%40example.com');
      expect(body).toContain('subject=Email%20de%20Teste');
    });

    it('should handle email sending failure', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid recipient' })
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await emailService.sendWelcomeEmail('invalid-email', 'Test User');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid recipient');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      (fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await emailService.sendWelcomeEmail('user@example.com', 'Test User');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle missing provider', async () => {
      // Create a service instance without initialization
      const result = await emailService.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service not configured');
    });
  });

  describe('Email Templates', () => {
    beforeEach(async () => {
      // Initialize service
      (Settings.getSetting as Mock)
        .mockResolvedValueOnce('elasticemail')
        .mockResolvedValueOnce('test_api_key')
        .mockResolvedValueOnce('noreply@example.com')
        .mockResolvedValueOnce('Escola do SEO');

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await emailService.initialize();
      vi.clearAllMocks();
    });

    it('should include correct branding in welcome email', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await emailService.sendWelcomeEmail('user@example.com', 'Test User');

      const call = (fetch as Mock).mock.calls[0];
      const body = call[1].body;
      
      // Check for Portuguese branding
      expect(body).toContain('Bem-vindo');
      expect(body).toContain('Escola%20do%20SEO');
      expect(body).toContain('2024%20Escola%20do%20SEO');
    });

    it('should include magic link URL in magic link email', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await emailService.sendMagicLinkEmail('user@example.com', 'token123', 'Test User');

      const call = (fetch as Mock).mock.calls[0];
      const body = call[1].body;
      
      // Should contain magic link URL
      expect(body).toContain('auth%2Fmagic-link%3Ftoken%3Dtoken123');
    });

    it('should include reset link in password reset email', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await emailService.sendPasswordResetEmail('user@example.com', 'reset123', 'Test User');

      const call = (fetch as Mock).mock.calls[0];
      const body = call[1].body;
      
      // Should contain reset link
      expect(body).toContain('reset-password%3Ftoken%3Dreset123');
    });

    it('should use custom frontend URL when provided', async () => {
      process.env.FRONTEND_URL = 'https://tatame.example.com';

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await emailService.sendMagicLinkEmail('user@example.com', 'token123', 'Test User');

      const call = (fetch as Mock).mock.calls[0];
      const body = call[1].body;
      
      expect(body).toContain('https%3A%2F%2Ftatame.example.com');
    });

    it('should handle missing user names gracefully', async () => {
      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await emailService.sendMagicLinkEmail('user@example.com', 'token123');

      const call = (fetch as Mock).mock.calls[0];
      const body = call[1].body;
      
      // Should use fallback "usuário"
      expect(body).toContain('usu%C3%A1rio');
    });
  });

  describe('Provider Compatibility', () => {
    it('should work with ElasticEmail format', async () => {
      (Settings.getSetting as Mock)
        .mockResolvedValueOnce('elasticemail')
        .mockResolvedValueOnce('elastic_key')
        .mockResolvedValueOnce('sender@example.com')
        .mockResolvedValueOnce('Sender Name');

      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      await emailService.initialize();
      await emailService.send({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
        text: 'Test content'
      });

      // Check ElasticEmail API call format
      const sendCall = (fetch as Mock).mock.calls[1];
      expect(sendCall[0]).toBe('https://api.elasticemail.com/v2/email/send');
      expect(sendCall[1].method).toBe('POST');
      expect(sendCall[1].headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    });

    it('should work with Brevo format', async () => {
      (Settings.getSetting as Mock)
        .mockResolvedValueOnce('brevo')
        .mockResolvedValueOnce('brevo_key')
        .mockResolvedValueOnce('sender@example.com')
        .mockResolvedValueOnce('Sender Name');

      (fetch as Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ email: 'sender@example.com' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ messageId: 'brevo123' })
        });

      await emailService.initialize();
      await emailService.send({
        to: ['recipient@example.com'],
        subject: 'Test Subject',
        html: '<p>Test content</p>'
      });

      // Check Brevo API call format
      const sendCall = (fetch as Mock).mock.calls[1];
      expect(sendCall[0]).toBe('https://api.brevo.com/v3/smtp/email');
      expect(sendCall[1].method).toBe('POST');
      expect(sendCall[1].headers['api-key']).toBe('brevo_key');
      expect(sendCall[1].headers['content-type']).toBe('application/json');

      const body = JSON.parse(sendCall[1].body);
      expect(body.to).toEqual([{ email: 'recipient@example.com' }]);
    });
  });

  describe('Connection Testing', () => {
    it('should test ElasticEmail connection', async () => {
      (Settings.getSetting as Mock)
        .mockResolvedValueOnce('elasticemail')
        .mockResolvedValueOnce('test_key')
        .mockResolvedValueOnce('test@example.com')
        .mockResolvedValueOnce('Test');

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          data: { email: 'test@example.com', credit: 1000 }
        })
      });

      await emailService.initialize();

      const result = await emailService.testConnection();
      expect(result.success).toBe(true);
    });

    it('should test Brevo connection', async () => {
      (Settings.getSetting as Mock)
        .mockResolvedValueOnce('brevo')
        .mockResolvedValueOnce('test_key')
        .mockResolvedValueOnce('test@example.com')
        .mockResolvedValueOnce('Test');

      (fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          email: 'test@example.com', 
          companyName: 'Test Company'
        })
      });

      await emailService.initialize();

      const result = await emailService.testConnection();
      expect(result.success).toBe(true);
    });

    it('should handle connection test failure', async () => {
      (Settings.getSetting as Mock)
        .mockResolvedValueOnce('elasticemail')
        .mockResolvedValueOnce('invalid_key')
        .mockResolvedValueOnce('test@example.com')
        .mockResolvedValueOnce('Test');

      (fetch as Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid API key' })
      });

      await emailService.initialize();

      const result = await emailService.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });
  });
});