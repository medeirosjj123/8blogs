/**
 * Plan configuration and limits for the new tiered system
 */

export interface PlanConfig {
  name: string;
  blogsLimit: number;
  reviewsLimit: number;
  features: {
    bulkUpload: boolean;
    weeklyCalls: boolean;
    coursesAccess: boolean;
    prioritySupport: boolean;
  };
}

export const PLAN_CONFIGS: Record<'starter' | 'pro' | 'black_belt', PlanConfig> = {
  starter: {
    name: 'Starter',
    blogsLimit: 1,
    reviewsLimit: 40,
    features: {
      bulkUpload: false,
      weeklyCalls: false,
      coursesAccess: false,
      prioritySupport: false
    }
  },
  pro: {
    name: 'Pro',
    blogsLimit: 3,
    reviewsLimit: 100,
    features: {
      bulkUpload: false,
      weeklyCalls: false,
      coursesAccess: false,
      prioritySupport: true
    }
  },
  black_belt: {
    name: 'Black Belt',
    blogsLimit: -1, // Unlimited
    reviewsLimit: -1, // Unlimited
    features: {
      bulkUpload: true, // KEY DIFFERENTIATOR
      weeklyCalls: true,
      coursesAccess: true,
      prioritySupport: true
    }
  }
};

/**
 * Get plan configuration by plan name
 */
export const getPlanConfig = (plan: string): PlanConfig => {
  const planKey = plan as keyof typeof PLAN_CONFIGS;
  return PLAN_CONFIGS[planKey] || PLAN_CONFIGS.starter;
};

/**
 * Update user subscription with plan defaults
 */
export const applyPlanDefaults = (plan: string) => {
  const config = getPlanConfig(plan);
  
  return {
    plan,
    blogsLimit: config.blogsLimit,
    reviewsLimit: config.reviewsLimit,
    reviewsUsed: 0,
    billingCycle: plan === 'black_belt' ? 'yearly' : 'monthly',
    features: { ...config.features },
    nextResetDate: (() => {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);
      return nextMonth;
    })()
  };
};