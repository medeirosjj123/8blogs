// Kiwify product configuration
// These URLs will be provided by the user once Kiwify products are set up

export const KIWIFY_PRODUCTS = {
  starter: {
    productId: 'KIWIFY_STARTER_ID', // To be replaced with actual product ID
    checkoutUrl: import.meta.env.VITE_KIWIFY_STARTER_URL || 'https://checkout.kiwify.com.br/starter-placeholder',
  },
  pro: {
    productId: 'KIWIFY_PRO_ID', // To be replaced with actual product ID  
    checkoutUrl: import.meta.env.VITE_KIWIFY_PRO_URL || 'https://checkout.kiwify.com.br/pro-placeholder',
  },
  black_belt: {
    productId: 'KIWIFY_BLACK_BELT_ID', // To be replaced with actual product ID
    checkoutUrl: import.meta.env.VITE_KIWIFY_BLACK_BELT_URL || 'https://checkout.kiwify.com.br/black-belt-placeholder',
  }
} as const;

// Plan pricing information (synced with planConfig.ts)
export const PLAN_PRICING = {
  starter: {
    name: 'Starter',
    price: 'R$ 97',
    period: '/mês',
    blogsLimit: 1,
    reviewsLimit: 40,
    features: [
      '1 blog ativo',
      '40 reviews por mês',
      'Templates básicos',
      'Integração Amazon',
      'Suporte por email'
    ],
    limitations: [
      'Sem upload em massa',
      'Sem acesso à comunidade',
      'Sem cursos inclusos'
    ]
  },
  pro: {
    name: 'Pro', 
    price: 'R$ 297',
    period: '/mês',
    blogsLimit: 3,
    reviewsLimit: 100,
    features: [
      '3 blogs ativos',
      '100 reviews por mês',
      'Templates premium',
      'Integração Amazon',
      'Analytics avançados',
      'Suporte prioritário'
    ],
    limitations: [
      'Sem upload em massa',
      'Sem acesso à comunidade',
      'Sem cursos inclusos'
    ]
  },
  black_belt: {
    name: 'Black Belt',
    price: 'R$ 1.997',
    period: '/ano',
    blogsLimit: -1, // Unlimited
    reviewsLimit: -1, // Unlimited
    features: [
      'Blogs ilimitados',
      'Reviews ilimitadas',
      '🚀 GERAÇÃO EM MASSA (CSV)',
      '👥 Comunidade exclusiva',
      '📚 Todos os cursos inclusos',
      '🎯 Templates premium',
      '📞 Chamadas semanais',
      '⚡ Suporte prioritário 24/7'
    ],
    limitations: []
  }
} as const;

export type PlanType = keyof typeof KIWIFY_PRODUCTS;