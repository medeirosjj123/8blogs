/**
 * Model Context Protocol Configuration
 * This file exposes the project context to AI tools
 */

module.exports = {
  // Project Information
  project: {
    name: 'Tatame',
    version: '0.1.0',
    description: 'Área de membros para Afiliado Faixa Preta - Plataforma de ensino de SEO com automação de sites WordPress',
    repository: 'https://github.com/afiliadofaixapreta/tatame',
    domain: 'tatame.afiliadofaixapreta.com.br'
  },

  // Technology Stack
  stack: {
    frontend: {
      framework: 'React',
      bundler: 'Vite',
      styling: 'Tailwind CSS',
      ui: 'shadcn/ui',
      animations: 'Framer Motion',
      state: 'TanStack Query'
    },
    backend: {
      runtime: 'Node.js',
      framework: 'Express',
      language: 'TypeScript',
      database: 'MongoDB Atlas',
      queue: 'BullMQ + Redis',
      realtime: 'Socket.IO'
    },
    infrastructure: {
      hosting: 'VPS Ubuntu',
      proxy: 'Nginx',
      process: 'PM2',
      storage: 'Backblaze B2',
      cdn: 'Cloudflare',
      ci: 'GitHub Actions'
    }
  },

  // Key Features
  features: {
    auth: ['Magic Link', 'Google OAuth', '2FA (optional)'],
    installer: 'WordPress site provisioning with Cloudflare automation',
    community: 'Slack-like chat with channels and DMs',
    courses: 'Video lessons with Vimeo player',
    gamification: 'Belt system (white to black)',
    integrations: ['Kiwify (payments)', 'n8n (automation)', 'Cloudflare API']
  },

  // Project Structure
  structure: {
    type: 'monorepo',
    tool: 'Turborepo',
    packageManager: 'pnpm',
    apps: [
      'apps/web (Frontend)',
      'apps/api (Backend)',
      'apps/jobs (Queue Workers)'
    ],
    packages: [
      'packages/shared (Types & Utils)',
      'packages/ui (Components)',
      'packages/auth (Authentication)'
    ]
  },

  // Core Documents
  documents: {
    specification: './tatame.md',
    mcp: './mcp.md',
    tasks: './tasks/',
    claude: './CLAUDE.md'
  },

  // Environment Variables
  environment: {
    required: [
      'MONGODB_URI',
      'REDIS_URL',
      'CLOUDFLARE_API_TOKEN',
      'KIWIFY_WEBHOOK_SECRET',
      'JWT_SECRET',
      'MAGIC_LINK_SECRET'
    ],
    optional: [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'B2_KEY_ID',
      'B2_APPLICATION_KEY',
      'SENTRY_DSN'
    ]
  },

  // Development Commands
  commands: {
    dev: 'pnpm dev',
    build: 'pnpm build',
    test: 'pnpm test',
    lint: 'pnpm lint',
    typecheck: 'pnpm check-types',
    deploy: 'pnpm deploy'
  },

  // API Endpoints (MVP)
  endpoints: {
    auth: {
      magicLink: 'POST /api/auth/magic-link',
      verify: 'POST /api/auth/verify',
      google: 'GET /api/auth/google',
      logout: 'POST /api/auth/logout'
    },
    sites: {
      create: 'POST /api/sites',
      status: 'GET /api/sites/:id/status',
      list: 'GET /api/sites'
    },
    webhooks: {
      n8n: 'POST /api/webhooks/n8n',
      kiwify: 'POST /api/webhooks/kiwify'
    }
  },

  // MCP Server Configuration
  server: {
    port: process.env.MCP_PORT || 3333,
    host: 'localhost',
    version: 'v1',
    endpoints: {
      project: '/v1/context/project',
      stack: '/v1/context/stack',
      features: '/v1/context/features',
      structure: '/v1/context/structure',
      documents: '/v1/context/documents',
      environment: '/v1/context/environment',
      commands: '/v1/context/commands',
      endpoints: '/v1/context/endpoints'
    }
  }
};