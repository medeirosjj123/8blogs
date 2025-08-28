import { WordPressPlugin } from '../models/WordPressPlugin';
import mongoose from 'mongoose';

export const seedWordPressPlugins = async (adminUserId: string) => {
  console.log('🔌 Seeding WordPress plugins...');

  const plugins = [
    // SEO Plugins
    {
      name: 'Yoast SEO',
      slug: 'wordpress-seo',
      description: 'Plugin de SEO mais popular do WordPress com análise de conteúdo e otimização técnica.',
      category: 'seo',
      version: '22.0',
      author: 'Team Yoast',
      rating: 4.6,
      downloadCount: 5000000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['Content Analysis', 'XML Sitemaps', 'Meta Tags', 'Schema Markup', 'Readability Check'],
      tags: ['seo', 'xml-sitemap', 'google', 'meta', 'schema'],
      minWordPressVersion: '6.1',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      dependencies: [],
      conflicts: ['rank-math', 'all-in-one-seo-pack'],
      metadata: {
        homepageUrl: 'https://yoast.com/wordpress/plugins/seo/',
        supportUrl: 'https://wordpress.org/support/plugin/wordpress-seo/',
        shortDescription: 'Melhore seu SEO: escreva conteúdo melhor e tenha um site WordPress totalmente otimizado.',
        screenshotUrls: ['https://ps.w.org/wordpress-seo/assets/screenshot-1.png'],
        faq: [
          'Como configurar o Yoast SEO?',
          'O que são meta descriptions?',
          'Como otimizar títulos SEO?'
        ]
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },
    {
      name: 'RankMath SEO',
      slug: 'seo-by-rank-math',
      description: 'Plugin SEO completo com AI integration e análise avançada.',
      category: 'seo',
      version: '1.0.120',
      author: 'Rank Math',
      rating: 4.8,
      downloadCount: 1000000,
      isDefault: false,
      isActive: true,
      isPremium: false,
      features: ['AI SEO', 'Rich Snippets', 'Local SEO', 'WooCommerce SEO', 'Google Analytics'],
      tags: ['seo', 'rich-snippets', 'ai', 'analytics', 'local-seo'],
      minWordPressVersion: '5.6',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      dependencies: [],
      conflicts: ['wordpress-seo', 'all-in-one-seo-pack'],
      metadata: {
        homepageUrl: 'https://rankmath.com/',
        supportUrl: 'https://wordpress.org/support/plugin/seo-by-rank-math/',
        shortDescription: 'Plugin SEO mais avançado do WordPress com AI e interface moderna.',
        screenshotUrls: ['https://ps.w.org/seo-by-rank-math/assets/screenshot-1.png']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },

    // Security Plugins
    {
      name: 'Wordfence Security',
      slug: 'wordfence',
      description: 'Plugin de segurança completo com firewall, scanner de malware e proteção de login.',
      category: 'security',
      version: '7.10.6',
      author: 'Wordfence',
      rating: 4.7,
      downloadCount: 4000000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['Web Application Firewall', 'Malware Scanner', 'Login Security', 'Real-time Traffic View'],
      tags: ['security', 'firewall', 'malware', 'login-protection', 'scanner'],
      minWordPressVersion: '5.5',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      dependencies: [],
      conflicts: [],
      metadata: {
        homepageUrl: 'https://www.wordfence.com/',
        supportUrl: 'https://wordpress.org/support/plugin/wordfence/',
        shortDescription: 'Proteção de segurança WordPress mais completa disponível.',
        screenshotUrls: ['https://ps.w.org/wordfence/assets/screenshot-1.jpg']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },
    {
      name: 'Sucuri Security',
      slug: 'sucuri-scanner',
      description: 'Auditoria de segurança, scanner de malware e monitoramento de integridade.',
      category: 'security',
      version: '1.8.44',
      author: 'Sucuri Inc.',
      rating: 4.5,
      downloadCount: 800000,
      isDefault: false,
      isActive: true,
      isPremium: false,
      features: ['Security Scanner', 'File Integrity Monitor', 'Security Hardening', 'Access Control'],
      tags: ['security', 'scanner', 'hardening', 'monitoring', 'malware'],
      minWordPressVersion: '4.7',
      testedUpTo: '6.5',
      requiresPHP: '5.6',
      dependencies: [],
      conflicts: [],
      metadata: {
        homepageUrl: 'https://sucuri.net/',
        supportUrl: 'https://wordpress.org/support/plugin/sucuri-scanner/',
        shortDescription: 'Scanner de segurança, monitoramento de integridade e auditoria.',
        screenshotUrls: ['https://ps.w.org/sucuri-scanner/assets/screenshot-1.png']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },

    // Performance Plugins
    {
      name: 'W3 Total Cache',
      slug: 'w3-total-cache',
      description: 'Plugin de cache completo para otimização de performance.',
      category: 'performance',
      version: '2.7.0',
      author: 'BoldGrid',
      rating: 4.2,
      downloadCount: 1000000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['Page Cache', 'Database Cache', 'Object Cache', 'CDN Integration', 'Minification'],
      tags: ['cache', 'performance', 'speed', 'cdn', 'optimization'],
      minWordPressVersion: '5.3',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      dependencies: [],
      conflicts: ['wp-super-cache', 'wp-rocket'],
      metadata: {
        homepageUrl: 'https://www.boldgrid.com/w3-total-cache/',
        supportUrl: 'https://wordpress.org/support/plugin/w3-total-cache/',
        shortDescription: 'Melhore a performance do site e experiência do usuário via cache.',
        screenshotUrls: ['https://ps.w.org/w3-total-cache/assets/screenshot-1.png']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },
    {
      name: 'WP Super Cache',
      slug: 'wp-super-cache',
      description: 'Plugin de cache simples e eficiente para acelerar seu WordPress.',
      category: 'performance',
      version: '1.12.2',
      author: 'Automattic',
      rating: 4.4,
      downloadCount: 2000000,
      isDefault: false,
      isActive: true,
      isPremium: false,
      features: ['Static HTML Cache', 'CDN Support', 'Preloading', 'Mobile Support'],
      tags: ['cache', 'performance', 'speed', 'static'],
      minWordPressVersion: '5.1',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      dependencies: [],
      conflicts: ['w3-total-cache', 'wp-rocket'],
      metadata: {
        homepageUrl: 'https://wordpress.org/plugins/wp-super-cache/',
        supportUrl: 'https://wordpress.org/support/plugin/wp-super-cache/',
        shortDescription: 'Plugin de cache muito rápido para WordPress.',
        screenshotUrls: ['https://ps.w.org/wp-super-cache/assets/screenshot-1.png']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },

    // Backup Plugins
    {
      name: 'UpdraftPlus',
      slug: 'updraftplus',
      description: 'Plugin de backup mais popular com restore com um clique.',
      category: 'backup',
      version: '1.23.12',
      author: 'UpdraftPlus.Com, DavidAnderson',
      rating: 4.8,
      downloadCount: 3000000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['Automated Backups', 'Cloud Storage', 'One-Click Restore', 'Migration Tools'],
      tags: ['backup', 'restore', 'cloud', 'migration', 'automated'],
      minWordPressVersion: '3.2',
      testedUpTo: '6.5',
      requiresPHP: '5.6',
      dependencies: [],
      conflicts: [],
      metadata: {
        homepageUrl: 'https://updraftplus.com/',
        supportUrl: 'https://wordpress.org/support/plugin/updraftplus/',
        shortDescription: 'Backup e restore simples. Backup completo do WordPress.',
        screenshotUrls: ['https://ps.w.org/updraftplus/assets/screenshot-1.png']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },

    // Forms Plugins
    {
      name: 'Contact Form 7',
      slug: 'contact-form-7',
      description: 'Plugin de formulários flexível e simples de usar.',
      category: 'forms',
      version: '5.8.7',
      author: 'Takayuki Miyoshi',
      rating: 4.1,
      downloadCount: 5000000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['Flexible Forms', 'CAPTCHA Support', 'Akismet Integration', 'Multi-language'],
      tags: ['contact-form', 'form', 'email', 'ajax'],
      minWordPressVersion: '5.9',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      dependencies: [],
      conflicts: [],
      metadata: {
        homepageUrl: 'https://contactform7.com/',
        supportUrl: 'https://wordpress.org/support/plugin/contact-form-7/',
        shortDescription: 'Apenas mais um plugin de formulário de contato. Simples mas flexível.',
        screenshotUrls: ['https://ps.w.org/contact-form-7/assets/screenshot-1.png']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },
    {
      name: 'WPForms Lite',
      slug: 'wpforms-lite',
      description: 'Construtor de formulários drag & drop mais amigável do WordPress.',
      category: 'forms',
      version: '1.8.6.3',
      author: 'WPForms',
      rating: 4.9,
      downloadCount: 5000000,
      isDefault: false,
      isActive: true,
      isPremium: false,
      features: ['Drag & Drop Builder', 'Pre-built Templates', 'Anti-spam Protection', 'Responsive Forms'],
      tags: ['contact-form', 'form', 'contact', 'custom-form', 'drag-and-drop'],
      minWordPressVersion: '5.5',
      testedUpTo: '6.5',
      requiresPHP: '7.0',
      dependencies: [],
      conflicts: [],
      metadata: {
        homepageUrl: 'https://wpforms.com/',
        supportUrl: 'https://wordpress.org/support/plugin/wpforms-lite/',
        shortDescription: 'Construtor de formulários drag & drop mais amigável do WordPress.',
        screenshotUrls: ['https://ps.w.org/wpforms-lite/assets/screenshot-1.png']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },

    // E-commerce Plugins
    {
      name: 'WooCommerce',
      slug: 'woocommerce',
      description: 'Plataforma de e-commerce mais popular do mundo para WordPress.',
      category: 'ecommerce',
      version: '8.7.0',
      author: 'Automattic',
      rating: 4.4,
      downloadCount: 5000000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['Complete E-commerce', 'Payment Gateways', 'Shipping Options', 'Product Management'],
      tags: ['e-commerce', 'shop', 'cart', 'checkout', 'payments'],
      minWordPressVersion: '6.2',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      dependencies: [],
      conflicts: [],
      metadata: {
        homepageUrl: 'https://woocommerce.com/',
        supportUrl: 'https://wordpress.org/support/plugin/woocommerce/',
        shortDescription: 'A plataforma de e-commerce de código aberto mais personalizável do mundo.',
        screenshotUrls: ['https://ps.w.org/woocommerce/assets/screenshot-1.png']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },

    // Analytics Plugins
    {
      name: 'MonsterInsights',
      slug: 'google-analytics-for-wordpress',
      description: 'Plugin oficial do Google Analytics para WordPress.',
      category: 'analytics',
      version: '8.25.0',
      author: 'MonsterInsights',
      rating: 4.6,
      downloadCount: 3000000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['Google Analytics 4', 'E-commerce Tracking', 'Custom Dimensions', 'Real-time Stats'],
      tags: ['analytics', 'google-analytics', 'tracking', 'stats', 'ga4'],
      minWordPressVersion: '5.0',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      dependencies: [],
      conflicts: [],
      metadata: {
        homepageUrl: 'https://www.monsterinsights.com/',
        supportUrl: 'https://wordpress.org/support/plugin/google-analytics-for-wordpress/',
        shortDescription: 'O plugin de Google Analytics mais avançado do WordPress.',
        screenshotUrls: ['https://ps.w.org/google-analytics-for-wordpress/assets/screenshot-1.png']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },

    // Social Plugins
    {
      name: 'Social Warfare',
      slug: 'social-warfare',
      description: 'Plugin de compartilhamento social rápido e bonito.',
      category: 'social',
      version: '4.4.6.3',
      author: 'Warfare Plugins',
      rating: 4.5,
      downloadCount: 200000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['Social Share Buttons', 'Click Tracking', 'Pinterest Image', 'Custom Colors'],
      tags: ['social', 'sharing', 'facebook', 'twitter', 'pinterest'],
      minWordPressVersion: '4.6.1',
      testedUpTo: '6.5',
      requiresPHP: '5.6',
      dependencies: [],
      conflicts: [],
      metadata: {
        homepageUrl: 'https://warfareplugins.com/',
        supportUrl: 'https://wordpress.org/support/plugin/social-warfare/',
        shortDescription: 'Plugin de compartilhamento social mais rápido e bonito.',
        screenshotUrls: ['https://ps.w.org/social-warfare/assets/screenshot-1.jpg']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },

    // Content Plugins
    {
      name: 'Elementor',
      slug: 'elementor',
      description: 'Page builder #1 do WordPress com drag & drop visual.',
      category: 'content',
      version: '3.20.1',
      author: 'Elementor.com',
      rating: 4.5,
      downloadCount: 5000000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['Drag & Drop Builder', 'Visual Editor', 'Responsive Design', 'Widget Library'],
      tags: ['page-builder', 'editor', 'landing-page', 'drag-and-drop', 'visual'],
      minWordPressVersion: '6.0',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      dependencies: [],
      conflicts: [],
      metadata: {
        homepageUrl: 'https://elementor.com/',
        supportUrl: 'https://wordpress.org/support/plugin/elementor/',
        shortDescription: 'O page builder mais avançado do WordPress, com editor visual drag & drop.',
        screenshotUrls: ['https://ps.w.org/elementor/assets/screenshot-1.gif']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },

    // Utilities Plugins
    {
      name: 'Duplicate Post',
      slug: 'duplicate-post',
      description: 'Duplique posts, páginas e custom posts facilmente.',
      category: 'utilities',
      version: '4.5',
      author: 'Enrico Battocchi & Team',
      rating: 4.8,
      downloadCount: 5000000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['Clone Posts', 'Bulk Actions', 'Template Creation', 'Custom Post Types'],
      tags: ['duplicate', 'clone', 'copy', 'post', 'page'],
      minWordPressVersion: '5.5',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      dependencies: [],
      conflicts: [],
      metadata: {
        homepageUrl: 'https://duplicate-post.lopo.it/',
        supportUrl: 'https://wordpress.org/support/plugin/duplicate-post/',
        shortDescription: 'Duplique posts, páginas e custom posts.',
        screenshotUrls: ['https://ps.w.org/duplicate-post/assets/screenshot-1.png']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    }
  ];

  try {
    // Clear existing plugins
    await WordPressPlugin.deleteMany({});
    
    // Insert new plugins
    const insertedPlugins = await WordPressPlugin.insertMany(plugins);
    
    console.log(`✅ Successfully seeded ${insertedPlugins.length} WordPress plugins`);
    return insertedPlugins;
  } catch (error) {
    console.error('❌ Error seeding WordPress plugins:', error);
    throw error;
  }
};