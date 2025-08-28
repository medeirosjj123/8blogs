import { Settings } from '../models/Settings';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

interface EmailProvider {
  name: string;
  send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
}

// ElasticEmail Provider
class ElasticEmailProvider implements EmailProvider {
  name = 'elasticemail';
  private apiKey: string;
  private apiUrl = 'https://api.elasticemail.com/v2';
  private defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string) {
    this.apiKey = apiKey;
    this.defaultFrom = defaultFrom;
  }

  async send(options: EmailOptions) {
    try {
      const response = await fetch(`${this.apiUrl}/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          apikey: this.apiKey,
          from: options.from || this.defaultFrom,
          to: Array.isArray(options.to) ? options.to.join(',') : options.to,
          subject: options.subject,
          bodyHtml: options.html || '',
          bodyText: options.text || '',
          replyTo: options.replyTo || options.from || this.defaultFrom,
          ...(options.cc && { cc: options.cc.join(',') }),
          ...(options.bcc && { bcc: options.bcc.join(',') }),
        }).toString()
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return { 
          success: true, 
          messageId: data.data?.messageid || data.data?.transactionid 
        };
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('ElasticEmail send error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send email via ElasticEmail' 
      };
    }
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.apiUrl}/account/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          apikey: this.apiKey
        }).toString()
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return { 
          success: true,
          accountEmail: data.data?.email,
          credit: data.data?.credit
        };
      } else {
        throw new Error(data.error || 'Invalid API key');
      }
    } catch (error: any) {
      console.error('ElasticEmail test connection error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to connect to ElasticEmail' 
      };
    }
  }
}

// Brevo (SendinBlue) Provider - for future use
class BrevoProvider implements EmailProvider {
  name = 'brevo';
  private apiKey: string;
  private apiUrl = 'https://api.brevo.com/v3';
  private defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string) {
    this.apiKey = apiKey;
    this.defaultFrom = defaultFrom;
  }

  async send(options: EmailOptions) {
    try {
      const response = await fetch(`${this.apiUrl}/smtp/email`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { 
            email: options.from || this.defaultFrom,
            name: 'Escola do SEO'
          },
          to: Array.isArray(options.to) 
            ? options.to.map(email => ({ email }))
            : [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text,
          replyTo: { email: options.replyTo || options.from || this.defaultFrom },
          ...(options.cc && { cc: options.cc.map(email => ({ email })) }),
          ...(options.bcc && { bcc: options.bcc.map(email => ({ email })) }),
        })
      });

      const data = await response.json();

      if (response.ok) {
        return { 
          success: true, 
          messageId: data.messageId 
        };
      } else {
        throw new Error(data.message || 'Failed to send email');
      }
    } catch (error: any) {
      console.error('Brevo send error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send email via Brevo' 
      };
    }
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.apiUrl}/account`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'api-key': this.apiKey
        }
      });

      const data = await response.json();

      if (response.ok) {
        return { 
          success: true,
          accountEmail: data.email,
          companyName: data.companyName
        };
      } else {
        throw new Error(data.message || 'Invalid API key');
      }
    } catch (error: any) {
      console.error('Brevo test connection error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to connect to Brevo' 
      };
    }
  }
}

// Main Email Service
class EmailService {
  private provider: EmailProvider | null = null;

  async initialize() {
    try {
      const provider = await Settings.getSetting('email', 'provider');
      const apiKey = await Settings.getSetting('email', 'apiKey');
      const fromEmail = await Settings.getSetting('email', 'fromEmail');
      const fromName = await Settings.getSetting('email', 'fromName');

      if (!provider || !apiKey || !fromEmail) {
        console.warn('Email service not configured');
        return;
      }

      const defaultFrom = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

      switch (provider) {
        case 'elasticemail':
          this.provider = new ElasticEmailProvider(apiKey, defaultFrom);
          break;
        case 'brevo':
          this.provider = new BrevoProvider(apiKey, defaultFrom);
          break;
        default:
          console.warn(`Unknown email provider: ${provider}`);
      }

      if (this.provider) {
        const test = await this.provider.testConnection();
        if (test.success) {
          console.info(`✅ Email service initialized successfully with ${provider}`);
        } else {
          console.error(`Failed to initialize email service: ${test.error}`);
          // Don't null the provider - let it try to send anyway
          console.warn('⚠️ Continuing with email provider despite connection test failure');
        }
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
    }
  }

  async send(options: EmailOptions) {
    if (!this.provider) {
      await this.initialize();
    }

    if (!this.provider) {
      console.error('Email provider not configured');
      return { 
        success: false, 
        error: 'Email service not configured' 
      };
    }

    return this.provider.send(options);
  }

  async testConnection() {
    if (!this.provider) {
      await this.initialize();
    }

    if (!this.provider) {
      return { 
        success: false, 
        error: 'Email service not configured' 
      };
    }

    return this.provider.testConnection();
  }

  async sendPasswordResetEmail(email: string, resetToken: string, userName?: string) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E10600;">Redefinir Senha - Escola do SEO</h2>
        <p>Olá ${userName || 'usuário'},</p>
        <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #E10600; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Redefinir Senha
          </a>
        </div>
        <p>Ou copie e cole este link no seu navegador:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          Este link expira em 1 hora. Se você não solicitou a redefinição de senha, ignore este email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          © 2024 Escola do SEO - A Escola de SEO Mais Completa do Brasil
        </p>
      </div>
    `;

    return this.send({
      to: email,
      subject: 'Redefinir Senha - Escola do SEO',
      html,
      text: `Redefinir sua senha: ${resetUrl}`
    });
  }

  async sendWelcomeEmail(email: string, userName: string) {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E10600;">Bem-vindo à Escola do SEO!</h2>
        <p>Olá ${userName},</p>
        <p>Sua conta foi criada com sucesso! Você já pode acessar a escola de SEO mais completa do Brasil.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #E10600; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Acessar Plataforma
          </a>
        </div>
        <h3 style="color: #333;">O que você vai encontrar:</h3>
        <ul style="color: #666;">
          <li>Cursos completos de SEO</li>
          <li>Ferramentas de automação</li>
          <li>Comunidade ativa</li>
          <li>Suporte dedicado</li>
        </ul>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          Se tiver qualquer dúvida, entre em contato com nosso suporte.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          © 2024 Escola do SEO - A Escola de SEO Mais Completa do Brasil
        </p>
      </div>
    `;

    return this.send({
      to: email,
      subject: 'Bem-vindo à Escola do SEO!',
      html,
      text: `Bem-vindo à Escola do SEO! Acesse: ${loginUrl}`
    });
  }

  async sendMagicLinkEmail(email: string, token: string, userName?: string) {
    const magicLinkUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/magic-link?token=${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E10600;">Acesso Rápido - Escola do SEO</h2>
        <p>Olá ${userName || 'usuário'},</p>
        <p>Recebemos uma solicitação para acessar sua conta. Clique no botão abaixo para fazer login automaticamente:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLinkUrl}" style="background-color: #E10600; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Acessar Minha Conta
          </a>
        </div>
        <p>Ou copie e cole este link no seu navegador:</p>
        <p style="color: #666; word-break: break-all;">${magicLinkUrl}</p>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          Este link expira em 15 minutos. Se você não solicitou este acesso, ignore este email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          © 2024 Escola do SEO - A Escola de SEO Mais Completa do Brasil
        </p>
      </div>
    `;

    return this.send({
      to: email,
      subject: 'Acesso Rápido à sua conta - Escola do SEO',
      html,
      text: `Acesse sua conta: ${magicLinkUrl}`
    });
  }

  async sendTestEmail(email: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E10600;">Email de Teste - Escola do SEO</h2>
        <p>Este é um email de teste enviado do painel administrativo.</p>
        <p>Se você recebeu este email, a configuração está funcionando corretamente!</p>
        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Provedor:</strong> ${this.provider?.name || 'Não configurado'}</p>
          <p style="margin: 0;"><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          © 2024 Escola do SEO - A Escola de SEO Mais Completa do Brasil
        </p>
      </div>
    `;

    return this.send({
      to: email,
      subject: 'Email de Teste - Escola do SEO',
      html,
      text: 'Este é um email de teste da Escola do SEO.'
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();