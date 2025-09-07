import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { Membership } from '../models/Membership';
import { KiwifyPurchaseEvent } from '../models/KiwifyPurchaseEvent';
import { emailService } from '../services/email.service';
import { emailQueueService } from '../services/emailQueue.service';
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
  'kiwify_product_basic': 'basic', // Legacy - keep for existing customers
  'kiwify_product_pro': 'pro',     // Legacy - keep for existing customers
  'kiwify_product_premium': 'premium', // Legacy - keep for existing customers
  
  // New Blog House pricing plans - Kiwify product IDs
  'OuiK7qL': 'starter',    // Starter plan
  '5TkGis8': 'black_belt', // Black Belt plan 
  'XiRxVyi': 'pro',        // Pro plan
  
  // Alternative mapping if Kiwify sends full URLs or different identifiers
  'kiwify_product_starter': 'starter',    
  'kiwify_product_pro': 'pro',         
  'kiwify_product_black_belt': 'black_belt'
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

function getSubscriptionLimits(plan: string) {
  switch (plan) {
    case 'starter':
      return {
        plan: 'starter' as const,
        blogsLimit: 1,
        reviewsLimit: 40,
        reviewsUsed: 0,
        billingCycle: 'monthly' as const,
        features: {
          bulkUpload: false,
          weeklyCalls: false,
          coursesAccess: false,
          prioritySupport: false
        }
      };
    case 'pro':
      return {
        plan: 'pro' as const,
        blogsLimit: 3,
        reviewsLimit: 100,
        reviewsUsed: 0,
        billingCycle: 'monthly' as const,
        features: {
          bulkUpload: false,
          weeklyCalls: false,
          coursesAccess: false,
          prioritySupport: true
        }
      };
    case 'black_belt':
      return {
        plan: 'black_belt' as const,
        blogsLimit: -1, // Unlimited
        reviewsLimit: -1, // Unlimited
        reviewsUsed: 0,
        billingCycle: 'yearly' as const,
        features: {
          bulkUpload: true,
          weeklyCalls: true,
          coursesAccess: true,
          prioritySupport: true
        }
      };
    case 'premium':
      return {
        plan: 'premium' as const,
        blogsLimit: -1, // Unlimited
        reviewsLimit: -1, // Unlimited
        reviewsUsed: 0,
        billingCycle: 'yearly' as const,
        features: {
          bulkUpload: true,
          weeklyCalls: true,
          coursesAccess: true,
          prioritySupport: true
        }
      };
    default:
      // Legacy plans or unknown - set to basic limits
      return {
        plan: 'starter' as const,
        blogsLimit: 1,
        reviewsLimit: 40,
        reviewsUsed: 0,
        billingCycle: 'monthly' as const,
        features: {
          bulkUpload: false,
          weeklyCalls: false,
          coursesAccess: false,
          prioritySupport: false
        }
      };
  }
}

// Customer self-service order status check
export const checkOrderStatus = async (req: Request, res: Response) => {
  try {
    const { email, orderId } = req.body;

    if (!email || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Email and order ID are required'
      });
    }

    // Find the purchase event
    const purchaseEvent = await KiwifyPurchaseEvent.findOne({
      orderId,
      customerEmail: email.toLowerCase()
    });

    if (!purchaseEvent) {
      return res.status(404).json({
        success: false,
        error: 'Order not found. Please check your email and order ID.'
      });
    }

    // Get detailed journey status
    const journeyStatus = {
      orderId: purchaseEvent.orderId,
      customerName: purchaseEvent.customerName,
      customerEmail: purchaseEvent.customerEmail,
      plan: purchaseEvent.mappedPlan,
      status: purchaseEvent.status,
      createdAt: purchaseEvent.createdAt,
      completedAt: purchaseEvent.completedAt,
      processingTimeMs: purchaseEvent.processingTimeMs,
      
      // Step-by-step journey
      journey: {
        orderReceived: true, // If we found the event, order was received
        userFound: purchaseEvent.userFound,
        userCreated: purchaseEvent.userCreated,
        membershipFound: purchaseEvent.membershipFound,
        membershipCreated: purchaseEvent.membershipCreated,
        subscriptionUpdated: purchaseEvent.subscriptionUpdated,
        welcomeEmailSent: purchaseEvent.welcomeEmailSent,
        magicLinkSent: purchaseEvent.magicLinkSent,
        credentialsDelivered: purchaseEvent.credentialsDelivered
      },
      
      // Error tracking
      errors: purchaseEvent.errors,
      retryInfo: {
        retryCount: purchaseEvent.retryCount,
        maxRetries: purchaseEvent.maxRetries,
        nextRetryAt: purchaseEvent.nextRetryAt
      }
    };

    // If credentials were not delivered but should be, offer to resend
    let canResend = false;
    if (purchaseEvent.status === 'success' && !purchaseEvent.credentialsDelivered) {
      canResend = true;
    }

    res.json({
      success: true,
      data: {
        ...journeyStatus,
        canResend,
        message: getStatusMessage(purchaseEvent)
      }
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, 'Error checking order status');
    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.'
    });
  }
};

// Resend credentials for a specific order
export const resendCredentials = async (req: Request, res: Response) => {
  try {
    const { email, orderId } = req.body;

    if (!email || !orderId) {
      return res.status(400).json({
        success: false,
        error: 'Email and order ID are required'
      });
    }

    // Find the purchase event
    const purchaseEvent = await KiwifyPurchaseEvent.findOne({
      orderId,
      customerEmail: email.toLowerCase()
    });

    if (!purchaseEvent) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    if (purchaseEvent.credentialsDelivered) {
      return res.status(400).json({
        success: false,
        error: 'Credentials have already been delivered for this order'
      });
    }

    // Generate new magic link token
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User account not found'
      });
    }

    const magicToken = await generateMagicLinkToken(user._id.toString());

    // Get plan details from user's membership
    const membership = await Membership.findOne({ userId: user._id });
    const subscriptionDetails = {
      plan: membership?.plan || purchaseEvent.mappedPlan,
      blogsLimit: membership?.blogsLimit || 1,
      reviewsLimit: membership?.reviewsLimit || 5,
      features: membership?.features ? Object.keys(membership.features).filter(k => membership.features[k]) : []
    };

    // Queue credential email with high priority
    await emailQueueService.queueCredentialEmail({
      orderId,
      customerEmail: email.toLowerCase(),
      customerName: purchaseEvent.customerName,
      magicToken,
      plan: purchaseEvent.mappedPlan,
      role: user.role,
      subscriptionDetails
    });

    logger.info({
      orderId,
      email: email.toLowerCase(),
      action: 'resend_credentials'
    }, 'Credentials resend requested by customer');

    res.json({
      success: true,
      message: 'Credentials have been queued for delivery. You should receive an email within the next few minutes.'
    });

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : error }, 'Error resending credentials');
    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.'
    });
  }
};

// Helper function to get user-friendly status messages
function getStatusMessage(purchaseEvent: any): string {
  switch (purchaseEvent.status) {
    case 'received':
      return 'Your order has been received and is being processed.';
    
    case 'processing':
      if (purchaseEvent.retryCount > 0) {
        return `Your order is being processed (attempt ${purchaseEvent.retryCount + 1}/${purchaseEvent.maxRetries}). We're working to deliver your credentials.`;
      }
      return 'Your order is currently being processed.';
    
    case 'success':
      if (purchaseEvent.credentialsDelivered) {
        return 'Your order has been completed successfully and credentials have been delivered!';
      }
      return 'Your account has been created but credentials are pending delivery. You can request a resend below.';
    
    case 'failed':
      if (purchaseEvent.retryCount >= purchaseEvent.maxRetries) {
        return 'There was an issue processing your order. Our support team has been notified and will contact you shortly.';
      }
      return 'There was a temporary issue with your order. We are retrying the process automatically.';
    
    default:
      return 'Order status unknown. Please contact support if this persists.';
  }
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
  const startTime = Date.now();
  
  // Create tracking record
  const trackingEvent = new KiwifyPurchaseEvent({
    orderId: data.order_id,
    customerId: data.customer_id,
    customerEmail: data.customer_email.toLowerCase(),
    customerName: data.customer_name,
    productId: data.product_id,
    productName: data.product_name,
    event: 'pedido_aprovado',
    payload: data,
    processedAt: new Date(),
    status: 'processing'
  });
  
  try {
    await trackingEvent.save();
    
    // Find or create user
    let user = await User.findOne({ email: data.customer_email.toLowerCase() });
    
    if (user) {
      trackingEvent.markStep('userFound', true);
    }
    
    if (!user) {
      // Create user if doesn't exist
      user = new User({
        email: data.customer_email.toLowerCase(),
        name: data.customer_name,
        role: 'starter', // Default to starter role (NOT aluno which doesn't exist)
        emailVerified: true // Consider verified if coming from Kiwify
      });
      await user.save();
      
      logger.info({ userId: user._id, email: user.email }, 'Created new user from Kiwify webhook');
      
      // Generate magic link for new user
      const magicLinkData = generateMagicLinkToken();
      user.magicLinkToken = magicLinkData.token;
      user.magicLinkExpiresAt = magicLinkData.expiresAt;
      await user.save();
      
      trackingEvent.markStep('userCreated', true);
      logger.info({ userId: user._id, email: user.email }, 'Created new user from Kiwify webhook');
    }
    
    // Map product to plan
    const plan = KIWIFY_PRODUCT_MAPPING[data.product_id] || 'starter'; // Default to starter (NOT basic which doesn't exist)
    
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
    
    // Get subscription limits for the plan
    const subscriptionLimits = getSubscriptionLimits(plan);
    
    // Update user role to match subscription plan
    switch (plan) {
      case 'black_belt':
        user.role = 'black_belt';
        break;
      case 'pro':
        user.role = 'pro';
        break;
      case 'premium': // Legacy plan - treat as black_belt
        user.role = 'black_belt';
        break;
      case 'starter':
      default:
        user.role = 'starter';
        break;
    }
    
    // Calculate next reset date (first day of next month)
    const nextResetDate = new Date();
    nextResetDate.setMonth(nextResetDate.getMonth() + 1);
    nextResetDate.setDate(1);
    nextResetDate.setHours(0, 0, 0, 0);
    
    // Update user subscription info
    user.subscription = {
      ...subscriptionLimits,
      nextResetDate: nextResetDate
    };
    
    // Update user membership info (keep legacy for compatibility)
    user.membership = {
      product: data.product_name,
      status: 'active',
      expiresAt: membership.currentPeriodEnd || undefined
    };
    await user.save();
    
    trackingEvent.markStep('subscriptionUpdated', true);
    
    // Queue credential email with all subscription details
    try {
      const magicLinkData = generateMagicLinkToken();
      user.magicLinkToken = magicLinkData.token;
      user.magicLinkExpiresAt = magicLinkData.expiresAt;
      await user.save();
      
      // Prepare feature list for email
      const features = [];
      if (subscriptionLimits.features.bulkUpload) features.push('🚀 Geração em massa de conteúdo');
      if (subscriptionLimits.features.weeklyCalls) features.push('📞 Calls semanais exclusivas');
      if (subscriptionLimits.features.coursesAccess) features.push('📚 Acesso completo aos cursos');
      if (subscriptionLimits.features.prioritySupport) features.push('⚡ Suporte prioritário');
      
      await emailQueueService.queueCredentialEmail({
        orderId: data.order_id,
        customerEmail: user.email,
        customerName: user.name,
        magicToken: magicLinkData.token,
        plan,
        role: user.role,
        subscriptionDetails: {
          plan,
          blogsLimit: subscriptionLimits.blogsLimit,
          reviewsLimit: subscriptionLimits.reviewsLimit,
          features
        }
      });
      
      trackingEvent.markStep('credentialsDelivered', true);
      await trackingEvent.markCompleted();
      
      logger.info({ 
        userId: user._id, 
        orderId: data.order_id, 
        plan,
        role: user.role 
      }, 'Credential email queued successfully');
      
    } catch (emailError) {
      trackingEvent.addError('email_queue', emailError instanceof Error ? emailError.message : 'Unknown error');
      await trackingEvent.markFailed(emailError instanceof Error ? emailError.message : 'Email queue failed');
      
      logger.error({ 
        error: emailError, 
        userId: user._id, 
        orderId: data.order_id 
      }, 'Failed to queue credential email');
    }
    
  } catch (error) {
    if (trackingEvent) {
      trackingEvent.addError('general', error instanceof Error ? error.message : 'Unknown error');
      await trackingEvent.markFailed(error instanceof Error ? error.message : 'Webhook processing failed');
    }
    
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
    
    // Update user membership status and reset to starter plan
    const user = await User.findById(membership.userId);
    if (user) {
      // Reset to starter plan subscription
      const starterLimits = getSubscriptionLimits('starter');
      const nextResetDate = new Date();
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);
      nextResetDate.setDate(1);
      nextResetDate.setHours(0, 0, 0, 0);
      
      user.subscription = {
        ...starterLimits,
        nextResetDate: nextResetDate
      };
      
      if (user.membership) {
        user.membership.status = 'cancelled';
      }
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
    
    // Update user membership and reset to starter plan
    const user = await User.findById(membership.userId);
    if (user) {
      // Reset to starter plan subscription
      const starterLimits = getSubscriptionLimits('starter');
      const nextResetDate = new Date();
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);
      nextResetDate.setDate(1);
      nextResetDate.setHours(0, 0, 0, 0);
      
      user.subscription = {
        ...starterLimits,
        nextResetDate: nextResetDate
      };
      
      if (user.membership) {
        user.membership.status = 'cancelled';
      }
      await user.save();
    }
    
    logger.info({ membershipId: membership._id }, 'Subscription cancelled');
    
  } catch (error) {
    logger.error({ error, subscriptionId: data.subscription_id }, 'Error handling subscription cancellation');
    throw error;
  }
}