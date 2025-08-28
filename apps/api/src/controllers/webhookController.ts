import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { Membership } from '../models/Membership';
import { emailService } from '../services/email.service';
import { generateMagicLinkToken } from '../utils/auth';
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

// Kiwify Product ID to Plan mapping
const KIWIFY_PRODUCT_MAPPING: Record<string, string> = {
  // Map your Kiwify product IDs to internal plans
  'kiwify_product_basic': 'basic',
  'kiwify_product_pro': 'pro',
  'kiwify_product_premium': 'premium'
};

interface KiwifyWebhookPayload {
  event: string;
  data: {
    order_id: string;
    customer_id: string;
    customer_email: string;
    customer_name: string;
    product_id: string;
    product_name: string;
    subscription_id?: string;
    payment_method?: string;
    amount?: number;
    currency?: string;
    status?: string;
    created_at?: string;
    metadata?: Record<string, any>;
  };
}

function verifyKiwifySignature(payload: string, signature: string): boolean {
  const secret = process.env.KIWIFY_WEBHOOK_SECRET;
  
  if (!secret) {
    logger.error('KIWIFY_WEBHOOK_SECRET not configured');
    return false;
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function handleKiwifyWebhook(req: Request, res: Response): Promise<void> {
  try {
    // Get raw body for signature verification
    const rawBody = (req as any).rawBody?.toString() || JSON.stringify(req.body);
    const signature = req.headers['x-kiwify-signature'] as string;
    
    // Verify webhook signature
    if (!signature || !verifyKiwifySignature(rawBody, signature)) {
      logger.warn('Invalid Kiwify webhook signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
    
    const payload: KiwifyWebhookPayload = req.body;
    
    logger.info({ 
      event: payload.event, 
      orderId: payload.data.order_id 
    }, 'Processing Kiwify webhook');
    
    // Process based on event type
    switch (payload.event) {
      case 'pedido_aprovado':
      case 'pedido_pago':
        await handlePurchaseApproved(payload.data);
        break;
        
      case 'pedido_cancelado':
      case 'pedido_reembolsado':
        await handlePurchaseCancelled(payload.data);
        break;
        
      case 'chargeback':
        await handleChargeback(payload.data);
        break;
        
      case 'assinatura_renovada':
        await handleSubscriptionRenewed(payload.data);
        break;
        
      case 'assinatura_cancelada':
        await handleSubscriptionCancelled(payload.data);
        break;
        
      default:
        logger.warn({ event: payload.event }, 'Unknown webhook event');
    }
    
    // Always respond 200 OK to Kiwify
    res.status(200).json({ received: true });
    
  } catch (error) {
    logger.error({ error }, 'Error processing Kiwify webhook');
    // Still return 200 to prevent retries
    res.status(200).json({ received: true, error: 'Processing error' });
  }
}

async function handlePurchaseApproved(data: KiwifyWebhookPayload['data']): Promise<void> {
  try {
    // Find or create user
    let user = await User.findOne({ email: data.customer_email.toLowerCase() });
    
    if (!user) {
      // Create user if doesn't exist
      user = new User({
        email: data.customer_email.toLowerCase(),
        name: data.customer_name,
        role: 'aluno',
        emailVerified: true // Consider verified if coming from Kiwify
      });
      await user.save();
      
      logger.info({ userId: user._id, email: user.email }, 'Created new user from Kiwify webhook');
      
      // Send welcome email and magic link for new users
      try {
        const magicLinkData = generateMagicLinkToken();
        user.magicLinkToken = magicLinkData.token;
        user.magicLinkExpiresAt = magicLinkData.expiresAt;
        await user.save();
        
        // Send both welcome and magic link emails
        await Promise.all([
          emailService.sendWelcomeEmail(user.email, user.name),
          emailService.sendMagicLinkEmail(user.email, magicLinkData.token, user.name)
        ]);
        
        logger.info({ userId: user._id }, 'Welcome and magic link emails sent to new user');
      } catch (emailError) {
        logger.error({ error: emailError, userId: user._id }, 'Failed to send welcome emails');
        // Don't throw - webhook should still succeed even if emails fail
      }
    }
    
    // Map product to plan
    const plan = KIWIFY_PRODUCT_MAPPING[data.product_id] || 'basic';
    
    // Check if membership already exists
    let membership = await Membership.findOne({ kiwifyOrderId: data.order_id });
    
    if (membership) {
      // Update existing membership
      membership.status = 'active';
      membership.currentPeriodStart = new Date();
      if (data.subscription_id) {
        membership.kiwifySubscriptionId = data.subscription_id;
      }
      await membership.save();
      
      logger.info({ membershipId: membership._id }, 'Reactivated existing membership');
      
      // Send reactivation email with magic link for existing users
      try {
        const magicLinkData = generateMagicLinkToken();
        user.magicLinkToken = magicLinkData.token;
        user.magicLinkExpiresAt = magicLinkData.expiresAt;
        await user.save();
        
        await emailService.sendMagicLinkEmail(user.email, magicLinkData.token, user.name);
        logger.info({ userId: user._id }, 'Reactivation magic link sent to existing user');
      } catch (emailError) {
        logger.error({ error: emailError, userId: user._id }, 'Failed to send reactivation email');
      }
    } else {
      // Create new membership
      membership = new Membership({
        userId: user._id,
        plan,
        status: 'active',
        kiwifyOrderId: data.order_id,
        kiwifyCustomerId: data.customer_id,
        kiwifyProductId: data.product_id,
        kiwifySubscriptionId: data.subscription_id,
        paymentMethod: data.payment_method,
        currentPeriodStart: new Date(),
        metadata: data.metadata
      });
      await membership.save();
      
      logger.info({ membershipId: membership._id }, 'Created new membership');
      
      // Send purchase confirmation email with magic link for existing users with new membership
      try {
        const magicLinkData = generateMagicLinkToken();
        user.magicLinkToken = magicLinkData.token;
        user.magicLinkExpiresAt = magicLinkData.expiresAt;
        await user.save();
        
        await emailService.sendMagicLinkEmail(user.email, magicLinkData.token, user.name);
        logger.info({ userId: user._id }, 'New membership magic link sent to existing user');
      } catch (emailError) {
        logger.error({ error: emailError, userId: user._id }, 'Failed to send new membership email');
      }
    }
    
    // Update user role based on plan
    if (plan === 'premium') {
      user.role = 'mentor';
    }
    
    // Update user membership info
    user.membership = {
      product: data.product_name,
      status: 'active',
      expiresAt: membership.currentPeriodEnd || undefined
    };
    await user.save();
    
  } catch (error) {
    logger.error({ error, orderId: data.order_id }, 'Error handling purchase approved');
    throw error;
  }
}

async function handlePurchaseCancelled(data: KiwifyWebhookPayload['data']): Promise<void> {
  try {
    const membership = await Membership.findOne({ kiwifyOrderId: data.order_id });
    
    if (!membership) {
      logger.warn({ orderId: data.order_id }, 'Membership not found for cancellation');
      return;
    }
    
    await membership.cancel('Purchase cancelled/refunded');
    
    // Update user membership status
    const user = await User.findById(membership.userId);
    if (user && user.membership) {
      user.membership.status = 'cancelled';
      await user.save();
    }
    
    logger.info({ membershipId: membership._id }, 'Membership cancelled');
    
  } catch (error) {
    logger.error({ error, orderId: data.order_id }, 'Error handling purchase cancellation');
    throw error;
  }
}

async function handleChargeback(data: KiwifyWebhookPayload['data']): Promise<void> {
  try {
    const membership = await Membership.findOne({ kiwifyOrderId: data.order_id });
    
    if (!membership) {
      logger.warn({ orderId: data.order_id }, 'Membership not found for chargeback');
      return;
    }
    
    await membership.suspend();
    
    // Update user membership status and potentially restrict access
    const user = await User.findById(membership.userId);
    if (user) {
      if (user.membership) {
        user.membership.status = 'cancelled';
      }
      // Could also flag the user account
      await user.save();
    }
    
    logger.info({ membershipId: membership._id }, 'Membership suspended due to chargeback');
    
  } catch (error) {
    logger.error({ error, orderId: data.order_id }, 'Error handling chargeback');
    throw error;
  }
}

async function handleSubscriptionRenewed(data: KiwifyWebhookPayload['data']): Promise<void> {
  try {
    const membership = await Membership.findOne({ 
      kiwifySubscriptionId: data.subscription_id 
    });
    
    if (!membership) {
      logger.warn({ subscriptionId: data.subscription_id }, 'Membership not found for renewal');
      return;
    }
    
    // Calculate new period end (typically 30 days for monthly)
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);
    
    await membership.renew(periodEnd);
    
    // Update user membership
    const user = await User.findById(membership.userId);
    if (user && user.membership) {
      user.membership.status = 'active';
      user.membership.expiresAt = periodEnd;
      await user.save();
    }
    
    logger.info({ membershipId: membership._id }, 'Subscription renewed');
    
  } catch (error) {
    logger.error({ error, subscriptionId: data.subscription_id }, 'Error handling subscription renewal');
    throw error;
  }
}

async function handleSubscriptionCancelled(data: KiwifyWebhookPayload['data']): Promise<void> {
  try {
    const membership = await Membership.findOne({ 
      kiwifySubscriptionId: data.subscription_id 
    });
    
    if (!membership) {
      logger.warn({ subscriptionId: data.subscription_id }, 'Membership not found for cancellation');
      return;
    }
    
    await membership.cancel('Subscription cancelled');
    
    // Update user membership
    const user = await User.findById(membership.userId);
    if (user && user.membership) {
      user.membership.status = 'cancelled';
      await user.save();
    }
    
    logger.info({ membershipId: membership._id }, 'Subscription cancelled');
    
  } catch (error) {
    logger.error({ error, subscriptionId: data.subscription_id }, 'Error handling subscription cancellation');
    throw error;
  }
}