import { Request, Response } from 'express';
import { EmailTemplate } from '../models/EmailTemplate';
import { emailService } from '../services/email.service';

// Default email templates
const defaultTemplates = [
  {
    name: 'Welcome Email',
    slug: 'welcome-email',
    subject: 'Bem-vindo ao {{siteName}}!',
    category: 'transactional',
    variables: ['userName', 'siteName', 'loginUrl'],
    description: 'Email enviado quando um novo usuário é criado',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px;">Bem-vindo ao {{siteName}}!</h1>
        </div>
        <div style="padding: 40px 20px; background: #ffffff;">
          <h2 style="color: #333; margin-bottom: 20px;">Olá {{userName}}! 👋</h2>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Estamos muito felizes em ter você conosco! Sua conta foi criada com sucesso e você já pode começar a explorar nossa plataforma.
          </p>
          <div style="margin: 30px 0;">
            <a href="{{loginUrl}}" style="display: inline-block; background: #E10600; color: white; padding: 14px 30px; text-decoration: none; border-radius: 30px; font-weight: bold;">
              Acessar Plataforma
            </a>
          </div>
          <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin-top: 30px;">
            <h3 style="color: #333; margin-top: 0;">O que você encontrará:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>📚 Cursos completos e atualizados</li>
              <li>🚀 Ferramentas de automação</li>
              <li>👥 Comunidade ativa e engajada</li>
              <li>💬 Suporte dedicado</li>
            </ul>
          </div>
        </div>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 14px; margin: 0;">
            © 2024 {{siteName}}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    `,
    previewData: {
      userName: 'João Silva',
      siteName: 'Tatame',
      loginUrl: 'https://tatame.com.br/login'
    }
  },
  {
    name: 'Password Reset',
    slug: 'password-reset',
    subject: 'Redefinir Senha - {{siteName}}',
    category: 'transactional',
    variables: ['userName', 'siteName', 'resetUrl', 'expirationTime'],
    description: 'Email para redefinição de senha',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a1a; padding: 40px 20px; text-align: center;">
          <h1 style="color: #E10600; margin: 0; font-size: 28px;">Redefinir Senha</h1>
        </div>
        <div style="padding: 40px 20px; background: #ffffff;">
          <h2 style="color: #333; margin-bottom: 20px;">Olá {{userName}},</h2>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Recebemos uma solicitação para redefinir a senha da sua conta. Se você não fez essa solicitação, pode ignorar este email.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="{{resetUrl}}" style="display: inline-block; background: #E10600; color: white; padding: 14px 40px; text-decoration: none; border-radius: 30px; font-weight: bold;">
              Redefinir Minha Senha
            </a>
          </div>
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              ⚠️ Este link expira em {{expirationTime}} hora(s). Após esse período, você precisará solicitar um novo link.
            </p>
          </div>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            Ou copie e cole este link no seu navegador:
          </p>
          <p style="color: #666; word-break: break-all; font-size: 14px; background: #f5f5f5; padding: 10px; border-radius: 4px;">
            {{resetUrl}}
          </p>
        </div>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            Por questões de segurança, nunca compartilhe este link com outras pessoas.
          </p>
          <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
            © 2024 {{siteName}}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    `,
    previewData: {
      userName: 'João Silva',
      siteName: 'Tatame',
      resetUrl: 'https://tatame.com.br/reset-password?token=abc123',
      expirationTime: '1'
    }
  },
  {
    name: 'Course Enrollment',
    slug: 'course-enrollment',
    subject: 'Você está inscrito em {{courseName}}!',
    category: 'notification',
    variables: ['userName', 'courseName', 'courseUrl', 'instructorName'],
    description: 'Email enviado quando o usuário se inscreve em um curso',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Nova Inscrição! 🎉</h1>
        </div>
        <div style="padding: 40px 20px; background: #ffffff;">
          <h2 style="color: #333; margin-bottom: 20px;">Parabéns {{userName}}!</h2>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Você está oficialmente inscrito no curso <strong>{{courseName}}</strong>!
          </p>
          <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #666; margin: 0;">
              <strong>Instrutor:</strong> {{instructorName}}<br>
              <strong>Formato:</strong> Online<br>
              <strong>Acesso:</strong> Vitalício
            </p>
          </div>
          <div style="margin: 30px 0; text-align: center;">
            <a href="{{courseUrl}}" style="display: inline-block; background: #667eea; color: white; padding: 14px 40px; text-decoration: none; border-radius: 30px; font-weight: bold;">
              Começar Agora
            </a>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Dica: Reserve um tempo dedicado para estudar e pratique o que aprender. O sucesso vem com consistência!
          </p>
        </div>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 14px; margin: 0;">
            Bons estudos! 📚
          </p>
        </div>
      </div>
    `,
    previewData: {
      userName: 'João Silva',
      courseName: 'SEO Avançado 2024',
      courseUrl: 'https://tatame.com.br/courses/seo-avancado',
      instructorName: 'Prof. Maria Santos'
    }
  },
  {
    name: 'Login Alert',
    slug: 'login-alert',
    subject: 'Novo login detectado em sua conta',
    category: 'notification',
    variables: ['userName', 'loginTime', 'loginLocation', 'loginDevice', 'ipAddress'],
    description: 'Alerta de segurança para novos logins',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc3545; padding: 30px 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Alerta de Segurança</h1>
        </div>
        <div style="padding: 40px 20px; background: #ffffff;">
          <h2 style="color: #333; margin-bottom: 20px;">Olá {{userName}},</h2>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Detectamos um novo login em sua conta:
          </p>
          <div style="background: #f8f8f8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <p style="color: #333; margin: 5px 0;"><strong>Data/Hora:</strong> {{loginTime}}</p>
            <p style="color: #333; margin: 5px 0;"><strong>Localização:</strong> {{loginLocation}}</p>
            <p style="color: #333; margin: 5px 0;"><strong>Dispositivo:</strong> {{loginDevice}}</p>
            <p style="color: #333; margin: 5px 0;"><strong>IP:</strong> {{ipAddress}}</p>
          </div>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            <strong>Foi você?</strong> Se sim, pode ignorar este email.
          </p>
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            <strong>Não foi você?</strong> Recomendamos que altere sua senha imediatamente e ative a autenticação de dois fatores.
          </p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="{{securityUrl}}" style="display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 30px; font-weight: bold;">
              Verificar Configurações de Segurança
            </a>
          </div>
        </div>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 12px; margin: 0;">
            Este é um email automático de segurança. Não responda.
          </p>
        </div>
      </div>
    `,
    previewData: {
      userName: 'João Silva',
      loginTime: '09/01/2024 às 14:30',
      loginLocation: 'São Paulo, Brasil',
      loginDevice: 'Chrome no Windows',
      ipAddress: '192.168.1.1',
      securityUrl: 'https://tatame.com.br/security'
    }
  }
];

// Get all email templates
export const getEmailTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await EmailTemplate.find({}).sort({ category: 1, name: 1 });
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get single template
export const getEmailTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const template = await EmailTemplate.findById(id);
    
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    res.json({ success: true, data: template });
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Create or update email template
export const upsertEmailTemplate = async (req: Request, res: Response) => {
  try {
    const { slug, ...templateData } = req.body;
    
    const template = await EmailTemplate.findOneAndUpdate(
      { slug },
      { 
        ...templateData,
        slug,
        updatedBy: req.user._id,
        updatedAt: new Date()
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );
    
    console.info(`Admin ${req.user.email} ${template.isNew ? 'created' : 'updated'} email template: ${template.name}`);
    
    res.json({ 
      success: true, 
      data: template,
      message: `Template ${template.isNew ? 'created' : 'updated'} successfully`
    });
  } catch (error) {
    console.error('Error upserting email template:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Delete email template
export const deleteEmailTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const template = await EmailTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    await EmailTemplate.findByIdAndDelete(id);
    
    console.info(`Admin ${req.user.email} deleted email template: ${template.name}`);
    
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Preview email template
export const previewEmailTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { previewData } = req.body;
    
    const template = await EmailTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    // Render template with preview data
    const rendered = template.render(previewData || template.previewData || {});
    
    res.json({ 
      success: true, 
      data: {
        subject: rendered.subject,
        html: rendered.htmlContent,
        text: rendered.textContent,
        variables: template.variables
      }
    });
  } catch (error) {
    console.error('Error previewing email template:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Send test email with template
export const sendTestEmailTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { testEmail, previewData } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({ success: false, message: 'Test email is required' });
    }
    
    const template = await EmailTemplate.findById(id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    // Render template
    const rendered = template.render(previewData || template.previewData || {});
    
    // Send email
    const result = await emailService.send({
      to: testEmail,
      subject: rendered.subject,
      html: rendered.htmlContent,
      text: rendered.textContent
    });
    
    if (result.success) {
      console.info(`Admin ${req.user.email} sent test email template ${template.name} to ${testEmail}`);
      res.json({ 
        success: true, 
        message: 'Test email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: result.error || 'Failed to send test email' 
      });
    }
  } catch (error) {
    console.error('Error sending test email template:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Initialize default templates
export const initializeDefaultTemplates = async (req: Request, res: Response) => {
  try {
    const results = [];
    
    for (const templateData of defaultTemplates) {
      const existing = await EmailTemplate.findOne({ slug: templateData.slug });
      
      if (!existing) {
        const template = new EmailTemplate({
          ...templateData,
          createdBy: req.user._id,
          updatedBy: req.user._id
        });
        
        await template.save();
        results.push({ name: template.name, status: 'created' });
      } else {
        results.push({ name: existing.name, status: 'exists' });
      }
    }
    
    console.info(`Admin ${req.user.email} initialized default email templates`);
    
    res.json({ 
      success: true, 
      message: 'Default templates initialized',
      data: results
    });
  } catch (error) {
    console.error('Error initializing default templates:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};