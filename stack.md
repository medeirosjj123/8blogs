# Stack Técnica - Projeto Tatame

## 📋 Visão Geral
Sistema completo para área de membros **Tatame** - Plataforma de ensino de SEO com automação de sites WordPress, comunidade e gamificação.

## 🎨 Design System & UI/UX

### Cores Principais
- **Preto**: `#000000` - Textos principais e elementos de destaque
- **Branco**: `#FFFFFF` - Backgrounds e textos sobre fundos escuros
- **Vermelho/Coral**: `#E10600` - Cor principal da marca, CTAs e elementos de ação

### Tipografia
- **Font Stack**: System fonts (sans-serif)
- **Tamanhos**: Mobile-first scaling
- **Peso**: Regular (400), Medium (500), Semibold (600), Bold (700)

### Componentes UI
- **Framework**: shadcn/ui customizado
- **Estilo**: Material Design adaptado
- **Cantos**: Arredondados 2xl (16px) como padrão
- **Shadows**: Sutis, multicamadas
- **Spacing**: Sistema baseado em 4px (Tailwind)

### Layout & Responsividade
- **Abordagem**: Mobile-first sempre
- **Breakpoints**: Tailwind CSS padrão
- **Navigation**: Bottom navigation com 5 ícones principais
- **Grid**: CSS Grid + Flexbox
- **Container**: Max-width responsivo

## 🚀 Frontend Stack

### Core Framework
- **React 18**: ^18.2.0
- **TypeScript**: ^5.0.0 (strict mode)
- **Vite**: ^4.4.0 (build tool)

### Styling & Design
- **Tailwind CSS**: ^3.3.0
- **shadcn/ui**: Componentes customizados
- **Lucide React**: Ícones
- **Framer Motion**: Animações e microinterações

### State Management
- **React Query/TanStack Query**: Cache e sincronização de servidor
- **Zustand**: Estado global da aplicação
- **React Hook Form**: Gerenciamento de formulários
- **Zod**: Validação de esquemas

### Routing & Navigation
- **React Router DOM**: v6+ com lazy loading
- **Code Splitting**: React.lazy + Suspense

### HTTP & API
- **Axios**: Cliente HTTP com interceptors
- **React Query**: Cache inteligente de requisições

## 🏗️ Backend Stack

### Runtime & Framework
- **Node.js**: ^18.0.0
- **Express.js**: ^4.18.0
- **TypeScript**: Tipagem completa

### Database & Storage
- **MongoDB Atlas**: Database principal (cloud)
- **Mongoose**: ODM com schemas TypeScript
- **Redis**: Cache e sessões (BullMQ)
- **Backblaze B2**: Storage de arquivos
- **Cloudflare CDN**: Distribuição de conteúdo

### Authentication & Security
- **JWT**: JSON Web Tokens
- **bcrypt**: Hash de senhas
- **Helmet**: Headers de segurança
- **CORS**: Cross-origin configurado
- **Rate Limiting**: express-rate-limit

### Queue & Jobs
- **BullMQ**: Filas de processamento
- **Redis**: Backend para filas
- **Cron Jobs**: Tarefas agendadas

## 🔧 Development Tools

### Build & Bundling
- **Vite**: Dev server + build
- **TypeScript Compiler**: tsc
- **ESBuild**: Transpilação rápida

### Code Quality
- **ESLint**: Linting JavaScript/TypeScript
- **Prettier**: Formatação de código
- **Husky**: Git hooks
- **lint-staged**: Pre-commit linting

### Package Management
- **pnpm**: Gerenciador de pacotes
- **Workspaces**: Monorepo com pnpm

## 🧪 Testing Stack

### Testing Frameworks
- **Vitest**: Testes unitários e integração
- **Playwright**: Testes E2E
- **Testing Library**: React testing utilities

### Test Types
- **Unit**: Utils, hooks, componentes isolados
- **Integration**: APIs e fluxos críticos
- **E2E**: Fluxos principais (login, instalação, chat)

## 🚀 DevOps & Deploy

### Infrastructure
- **VPS Ubuntu 22.04**: Servidor de produção
- **Nginx**: Reverse proxy + serving estático
- **PM2**: Process manager para Node.js
- **Let's Encrypt**: Certificados SSL

### CI/CD
- **GitHub Actions**: Pipeline de deploy
- **Docker**: Containerização (opcional)
- **Git**: Controle de versão

### Monitoring
- **Sentry**: Error tracking frontend/backend
- **Pino/Winston**: Logs estruturados
- **PM2 Monitoring**: Métricas de processo

## 🗄️ Database Design

### MongoDB Collections
- **users**: Usuários e perfis
- **installations**: Sites WordPress
- **messages**: Sistema de chat
- **channels**: Canais da comunidade
- **features**: Ferramentas disponíveis
- **categories**: Categorização de conteúdo

### Data Modeling
- **Mongoose Schemas**: Tipados com TypeScript
- **Indexes**: Performance otimizada
- **Aggregation**: Queries complexas
- **Transactions**: Operações críticas

## 🔌 External Integrations

### APIs & Services
- **Kiwify**: Webhooks para controle de acesso
- **Cloudflare API**: DNS e CDN management
- **Google OAuth**: Autenticação social
- **Magic Link**: Autenticação sem senha

### WordPress Automation
- **WordOps**: Provisionamento automatizado
- **SSH2**: Execução remota de comandos
- **Template System**: Sites pré-configurados

## 🎮 Real-time Features

### WebSocket
- **Socket.IO**: Chat em tempo real
- **Redis Adapter**: Scaling horizontal
- **Event Handling**: Tipado com TypeScript

### File Upload
- **Multer**: Middleware de upload
- **Backblaze B2**: Storage final
- **Image Processing**: Sharp (redimensionamento)

## 📱 Progressive Web App

### PWA Features
- **Service Worker**: Cache offline
- **Web App Manifest**: Instalação mobile
- **Push Notifications**: Engajamento

## 🔐 Security Stack

### Authentication
- **JWT + Refresh Tokens**: Sessões seguras
- **HttpOnly Cookies**: XSS protection
- **CSRF Tokens**: Cross-site request forgery protection
- **2FA**: Time-based OTP opcional

### Data Protection
- **Encryption**: Dados sensíveis
- **Input Validation**: Zod schemas
- **SQL Injection**: Mongoose protection
- **XSS Protection**: Sanitização de inputs

## 📊 Performance

### Frontend Optimization
- **Code Splitting**: Route-based
- **Lazy Loading**: Componentes e imagens
- **Bundle Analysis**: Webpack Bundle Analyzer
- **CDN**: Cloudflare para assets estáticos

### Backend Optimization
- **Redis Caching**: Queries frequentes
- **Database Indexing**: MongoDB indexes
- **Connection Pooling**: MongoDB/Redis
- **Rate Limiting**: API protection

## 🛠️ Development Workflow

### Environment Setup
- **Node.js 18+**: Runtime requirement
- **pnpm**: Package manager
- **MongoDB**: Local ou Atlas
- **Redis**: Local ou cloud

### Scripts Principais
```bash
pnpm dev          # Desenvolvimento completo
pnpm build        # Build de produção
pnpm test         # Suíte de testes
pnpm lint         # Code linting
pnpm type-check   # TypeScript check
```

### Git Workflow
- **Feature Branches**: Desenvolvimento isolado
- **Conventional Commits**: Mensagens padronizadas
- **Pre-commit Hooks**: Linting automático
- **Protected Main**: Reviews obrigatórios

## 📈 Scalability Considerations

### Horizontal Scaling
- **Stateless Backend**: Session em Redis
- **Load Balancing**: Nginx upstream
- **Database Sharding**: MongoDB clusters
- **CDN**: Global content distribution

### Monitoring & Observability
- **Health Checks**: `/health` endpoints
- **Metrics**: Application performance
- **Alerting**: Error thresholds
- **Logging**: Structured with correlation IDs

## 🔮 Future Tech Stack

### Planned Additions
- **GraphQL**: API layer evolution
- **Microservices**: Service decomposition
- **Kubernetes**: Container orchestration
- **Elasticsearch**: Advanced search
- **Machine Learning**: Content recommendations