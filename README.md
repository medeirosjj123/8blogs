# 🥋 Tatame - SEO Learning & Automation Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.8.3-blue.svg)

**Tatame** is a comprehensive membership platform for teaching SEO with a unique jiu-jitsu themed gamification system. Built for "Afiliado Faixa Preta" (Black Belt Affiliate), it combines community features, guided learning paths, and powerful automation tools.

## 🎯 Key Features

### 📚 **Learning Management**
- Progressive course modules with video lessons
- Gamification through "belt" system (white → black)
- Progress tracking and weekly "training" goals
- Interactive quizzes and execution checklists

### 💬 **Community Platform**
- Slack-like chat with channels and DMs
- Real-time messaging with Socket.IO
- Thread discussions and reactions
- File sharing and pinned messages
- Mobile-first responsive design

### 🛠️ **Automation Tools**
- One-click WordPress site installer
- CloudFlare DNS integration
- Pre-configured SEO templates
- Site monitoring and management

### 🔐 **Authentication & Security**
- Magic link authentication
- Google OAuth integration
- Two-factor authentication (2FA)
- Role-based access control (RBAC)
- Kiwify payment integration

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- PNPM 9.0.0
- MongoDB (Atlas or local)
- Redis (optional for queues)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tatame.git
cd tatame

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Configure your .env file with:
# - MongoDB connection string
# - JWT secrets
# - API keys (Cloudflare, Kiwify, etc.)
```

### Development

```bash
# Start all services (frontend + backend)
pnpm dev

# Or run services separately:
pnpm dev:web     # Frontend only (http://localhost:5173)
pnpm dev:api     # Backend only (http://localhost:3001)

# Clean start (kills existing processes)
pnpm dev:clean
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:coverage
```

## 📁 Project Structure

```
tatame/
├── apps/
│   ├── web/              # React + Vite frontend
│   └── api/              # Express.js backend
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── config/           # Shared configurations
│   ├── ui/               # Shared UI components
│   ├── eslint-config/    # ESLint configurations
│   └── typescript-config/# TypeScript configurations
├── scripts/              # Automation scripts
│   ├── provision/        # Site provisioning
│   └── deploy/           # Deployment scripts
└── tasks/                # Development task tracking
```

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** React Query
- **Real-time:** Socket.IO Client

### Backend
- **Runtime:** Node.js + Express
- **Database:** MongoDB with Mongoose
- **Queue:** Redis + BullMQ
- **Real-time:** Socket.IO
- **Storage:** Backblaze B2 + Cloudflare CDN

### DevOps
- **Monorepo:** Turborepo + PNPM Workspaces
- **Testing:** Vitest + Playwright
- **Deployment:** PM2 + Nginx
- **Monitoring:** Sentry

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Database
MONGODB_URI=mongodb+srv://...

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key
MAGIC_LINK_SECRET=your-magic-secret
SESSION_SECRET=your-session-secret

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Cloudflare
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...

# Kiwify Integration
KIWIFY_WEBHOOK_SECRET=...

# URLs
API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:5173
```

## 📊 API Documentation

### Health Check
```bash
GET http://localhost:3001/health
```

### Authentication
```bash
POST /api/v1/auth/login
POST /api/v1/auth/magic-link
POST /api/v1/auth/google
POST /api/v1/auth/logout
```

### User Management
```bash
GET  /api/v1/users/me
PUT  /api/v1/users/profile
POST /api/v1/users/avatar
```

### Chat/Community
```bash
GET  /api/v1/channels
POST /api/v1/messages
GET  /api/v1/messages/:channelId
```

## 🧪 Development Commands

```bash
# Code Quality
pnpm lint          # Run ESLint
pnpm format        # Format with Prettier
pnpm check-types   # TypeScript type checking

# Database
pnpm db:seed       # Seed development data

# Utilities
pnpm clean:ports   # Kill processes on dev ports
pnpm health        # Check service health
```

## 🚢 Deployment

### Production Build

```bash
# Build all packages
pnpm build

# Start production server
NODE_ENV=production pnpm start
```

### Docker Support (Coming Soon)

```bash
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Use ESLint and Prettier configurations
- Write tests for new features
- Update documentation as needed
- Follow conventional commits

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support, email support@afiliadofaixapreta.com.br or open an issue in the repository.

## 🔗 Links

- [Technical Documentation](./tatame.md)
- [API Documentation](./docs/api/)
- [Task Tracking](./tasks/)
- [Testing Guide](./TESTING_GUIDE.md)

---

Built with ❤️ for the Afiliado Faixa Preta community