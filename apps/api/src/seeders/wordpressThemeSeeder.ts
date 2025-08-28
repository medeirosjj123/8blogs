import { WordPressTheme } from '../models/WordPressTheme';
import mongoose from 'mongoose';

export const seedWordPressThemes = async (adminUserId: string) => {
  console.log('🎨 Seeding WordPress themes...');

  const themes = [
    // Blog Themes
    {
      name: 'Twenty Twenty-Four',
      slug: 'twentytwentyfour',
      description: 'O tema padrão do WordPress 2024, moderno e versátil para blogs e sites pessoais.',
      category: 'blog',
      version: '1.0',
      author: 'WordPress.org',
      rating: 4.8,
      downloadCount: 5000000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['Responsive Design', 'Block Editor Ready', 'SEO Optimized', 'Fast Loading'],
      tags: ['modern', 'clean', 'blog', 'responsive'],
      minWordPressVersion: '6.4',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      metadata: {
        homepageUrl: 'https://wordpress.org/themes/twentytwentyfour/',
        supportUrl: 'https://wordpress.org/support/theme/twentytwentyfour/',
        screenshotUrls: ['https://i0.wp.com/themes.svn.wordpress.org/twentytwentyfour/1.0/screenshot.png']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },
    {
      name: 'Astra',
      slug: 'astra',
      description: 'Tema leve e personalizável, perfeito para blogs, negócios e lojas online.',
      category: 'blog',
      version: '4.6.0',
      author: 'Brainstorm Force',
      rating: 4.9,
      downloadCount: 1000000,
      isDefault: false,
      isActive: true,
      isPremium: false,
      features: ['Ultra Fast', 'SEO Ready', 'WooCommerce Compatible', '60+ Starter Sites'],
      tags: ['multipurpose', 'lightweight', 'customizable', 'fast'],
      minWordPressVersion: '5.3',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      metadata: {
        homepageUrl: 'https://wpastra.com/',
        supportUrl: 'https://wordpress.org/support/theme/astra/',
        screenshotUrls: ['https://ps.w.org/astra/assets/screenshot-1.jpg']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },

    // Business Themes
    {
      name: 'GeneratePress',
      slug: 'generatepress',
      description: 'Tema empresarial profissional, rápido e altamente customizável.',
      category: 'business',
      version: '3.4.0',
      author: 'Tom Usborne',
      rating: 4.8,
      downloadCount: 400000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['Lightweight', 'Mobile Responsive', 'Accessibility Ready', 'Schema Markup'],
      tags: ['business', 'professional', 'clean', 'fast'],
      minWordPressVersion: '5.2',
      testedUpTo: '6.5',
      requiresPHP: '7.2',
      metadata: {
        homepageUrl: 'https://generatepress.com/',
        supportUrl: 'https://wordpress.org/support/theme/generatepress/',
        screenshotUrls: ['https://ps.w.org/generatepress/assets/screenshot-1.jpg']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },
    {
      name: 'OceanWP',
      slug: 'oceanwp',
      description: 'Tema multipropósito ideal para empresas, portfolios e lojas online.',
      category: 'business',
      version: '3.5.7',
      author: 'OceanWP',
      rating: 4.7,
      downloadCount: 800000,
      isDefault: false,
      isActive: true,
      isPremium: false,
      features: ['WooCommerce Integration', 'SEO Friendly', 'Translation Ready', 'Page Builder Compatible'],
      tags: ['multipurpose', 'woocommerce', 'responsive', 'customizable'],
      minWordPressVersion: '5.6',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      metadata: {
        homepageUrl: 'https://oceanwp.org/',
        supportUrl: 'https://wordpress.org/support/theme/oceanwp/',
        screenshotUrls: ['https://ps.w.org/oceanwp/assets/screenshot-1.jpg']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },

    // E-commerce Themes
    {
      name: 'Storefront',
      slug: 'storefront',
      description: 'Tema oficial do WooCommerce, perfeito para lojas online.',
      category: 'ecommerce',
      version: '4.5.0',
      author: 'Automattic',
      rating: 4.6,
      downloadCount: 200000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['WooCommerce Native', 'Mobile Optimized', 'Customizer Ready', 'Child Theme Friendly'],
      tags: ['ecommerce', 'woocommerce', 'shop', 'store'],
      minWordPressVersion: '5.0',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      metadata: {
        homepageUrl: 'https://woocommerce.com/storefront/',
        supportUrl: 'https://wordpress.org/support/theme/storefront/',
        screenshotUrls: ['https://ps.w.org/storefront/assets/screenshot-1.png']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },

    // Portfolio Themes
    {
      name: 'Sydney',
      slug: 'sydney',
      description: 'Tema moderno para portfolios e sites criativos.',
      category: 'portfolio',
      version: '1.42',
      author: 'aThemes',
      rating: 4.5,
      downloadCount: 300000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['Portfolio Layouts', 'Custom Widgets', 'Google Fonts', 'Social Media Integration'],
      tags: ['portfolio', 'creative', 'modern', 'onepage'],
      minWordPressVersion: '5.0',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      metadata: {
        homepageUrl: 'https://athemes.com/theme/sydney/',
        supportUrl: 'https://wordpress.org/support/theme/sydney/',
        screenshotUrls: ['https://ps.w.org/sydney/assets/screenshot-1.jpg']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },

    // Agency Themes
    {
      name: 'Neve',
      slug: 'neve',
      description: 'Tema super rápido para agências e empresas modernas.',
      category: 'agency',
      version: '3.7.0',
      author: 'ThemeIsle',
      rating: 4.8,
      downloadCount: 200000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['AMP Ready', 'Page Builder Compatible', 'Mobile First', 'SEO Optimized'],
      tags: ['agency', 'fast', 'modern', 'professional'],
      minWordPressVersion: '5.2',
      testedUpTo: '6.5',
      requiresPHP: '7.1',
      metadata: {
        homepageUrl: 'https://themeisle.com/themes/neve/',
        supportUrl: 'https://wordpress.org/support/theme/neve/',
        screenshotUrls: ['https://ps.w.org/neve/assets/screenshot-1.jpg']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },

    // Magazine Themes
    {
      name: 'ColorMag',
      slug: 'colormag',
      description: 'Tema magazine responsivo com múltiplos layouts.',
      category: 'magazine',
      version: '3.1.3',
      author: 'ThemeGrill',
      rating: 4.4,
      downloadCount: 100000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['Magazine Layout', 'Custom Widgets', 'Advertisement Areas', 'Translation Ready'],
      tags: ['magazine', 'news', 'blog', 'responsive'],
      minWordPressVersion: '5.0',
      testedUpTo: '6.5',
      requiresPHP: '7.4',
      metadata: {
        homepageUrl: 'https://themegrill.com/themes/colormag/',
        supportUrl: 'https://wordpress.org/support/theme/colormag/',
        screenshotUrls: ['https://ps.w.org/colormag/assets/screenshot-1.jpg']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    },

    // Landing Page Themes
    {
      name: 'OnePress',
      slug: 'onepress',
      description: 'Tema one-page perfeito para landing pages e sites promocionais.',
      category: 'landing',
      version: '2.3.8',
      author: 'FameThemes',
      rating: 4.6,
      downloadCount: 100000,
      isDefault: true,
      isActive: true,
      isPremium: false,
      features: ['One Page Layout', 'Parallax Scrolling', 'Call to Action', 'Portfolio Section'],
      tags: ['onepage', 'landing', 'parallax', 'business'],
      minWordPressVersion: '4.3',
      testedUpTo: '6.5',
      requiresPHP: '7.0',
      metadata: {
        homepageUrl: 'https://www.famethemes.com/themes/onepress/',
        supportUrl: 'https://wordpress.org/support/theme/onepress/',
        screenshotUrls: ['https://ps.w.org/onepress/assets/screenshot-1.jpg']
      },
      addedBy: new mongoose.Types.ObjectId(adminUserId)
    }
  ];

  try {
    // Clear existing themes
    await WordPressTheme.deleteMany({});
    
    // Insert new themes
    const insertedThemes = await WordPressTheme.insertMany(themes);
    
    console.log(`✅ Successfully seeded ${insertedThemes.length} WordPress themes`);
    return insertedThemes;
  } catch (error) {
    console.error('❌ Error seeding WordPress themes:', error);
    throw error;
  }
};