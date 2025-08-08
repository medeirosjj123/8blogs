# CLAUDE.md - Projeto Tatame

## 🎯 Visão Geral
Área de membros **Tatame** (`tatame.afiliadofaixapreta.com.br`) - Plataforma de ensino de SEO com automação de sites WordPress, comunidade e gamificação.

## 🏗️ Stack Técnica
- **Frontend**: React + Vite + TypeScript + Tailwind + shadcn/ui
- **Backend**: Node.js + Express (sem Docker)
- **Database**: MongoDB Atlas
- **Queue**: Redis + BullMQ
- **Storage**: Backblaze B2 + Cloudflare CDN
- **Deploy**: VPS Ubuntu + Nginx + PM2

## 🔑 Variáveis de Ambiente Críticas
```bash
# MongoDB
MONGODB_URI=mongodb+srv://...

# Redis
REDIS_URL=redis://localhost:6379

# Cloudflare
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=

# Kiwify
KIWIFY_WEBHOOK_SECRET=

# Backblaze B2
B2_KEY_ID=
B2_APPLICATION_KEY=
B2_BUCKET_NAME=

# Auth
JWT_SECRET=
MAGIC_LINK_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## 📁 Estrutura do Projeto
```
tatame/
├── apps/
│   ├── web/          # Frontend React+Vite
│   ├── api/          # Backend Express
│   └── jobs/         # Workers BullMQ
├── packages/
│   ├── shared/       # Types e utils compartilhados
│   ├── ui/           # Componentes shadcn customizados
│   └── auth/         # Lógica de autenticação
├── scripts/
│   ├── provision/    # Scripts de provisionamento
│   └── deploy/       # Scripts de deploy
└── docs/
    └── api/          # Documentação OpenAPI
```

## 🚀 Comandos Essenciais
```bash
# Desenvolvimento
npm run dev           # Inicia todos os serviços
npm run dev:web       # Apenas frontend
npm run dev:api       # Apenas backend
npm run dev:jobs      # Apenas workers

# Qualidade
npm run lint          # ESLint em todos os projetos
npm run type-check    # TypeScript check
npm run test          # Testes unitários
npm run test:e2e      # Testes E2E

# Build & Deploy
npm run build         # Build de produção
npm run deploy        # Deploy via GitHub Actions
```

## 🔐 Segurança & Compliance
- **Nunca** commitar secrets ou .env
- Usar **Zod** para toda validação de input
- **Rate limiting** em todas as rotas públicas
- **CSRF tokens** para ações sensíveis
- **Logs** com redação de dados sensíveis
- **2FA** opcional para usuários

## 🎨 Padrões de UI/UX
- **Cores**: Preto (#000), Branco (#FFF), Vermelho (#E10600)
- **Mobile-first** sempre
- **Bottom navigation** com 5 ícones
- Componentes **shadcn/ui** customizados
- Cantos arredondados 2xl
- Microinterações com Framer Motion

## 🏷️ Convenções de Código

### TypeScript
- Interfaces prefixadas com `I` (ex: `IUser`)
- Types sem prefixo (ex: `UserRole`)
- Enums em UPPER_CASE

### React
- Componentes em PascalCase
- Hooks customizados prefixados com `use`
- Props interfaces sufixadas com `Props`

### API
- Rotas RESTful pluralizadas
- Versionamento: `/api/v1/...`
- Responses padronizadas: `{ success, data, error }`

## 🧪 Testes
- Unitários com Vitest para utils e hooks
- Integração para APIs críticas
- E2E com Playwright para fluxos principais:
  - Login/Cadastro
  - Instalação de site
  - Primeira mensagem na comunidade

## 📦 Módulos Principais

### 1. Autenticação
- Magic Link (padrão)
- Google OAuth
- 2FA opcional (TOTP)
- Sessões com HttpOnly cookies

### 2. Instalador de Sites
- Script único de provisionamento
- WordOps + WordPress + Cloudflare
- Monitor de propagação DNS
- Templates curados

### 3. Comunidade (Chat)
- Socket.IO + Redis
- Canais, DMs, threads
- Upload de imagens (2MB max)
- Moderação

### 4. Suite SEO
- Silo Organizer
- Gerador de Outlines
- Escritor de Artigos
- Calculadora de Rendimento

### 5. Gamificação
- Sistema de "faixas" (branca → preta)
- Progresso por módulos
- "Treinos" semanais

## 🔄 Integração Kiwify
- Webhooks para grant/revoke de acesso
- Mapeamento produto → plano
- SSO pós-compra com autologin
- Idempotência com event_id

## 📊 Monitoramento
- **Sentry**: Erros frontend/backend
- **Logs estruturados**: Pino/Winston
- **Health checks**: /health endpoint
- **Métricas**: Jobs processados, usuários ativos

## 🚨 Troubleshooting Comum

### Problema: Webhook Kiwify não funciona
1. Verificar assinatura do webhook
2. Checar logs em `/var/log/tatame/webhooks.log`
3. Testar com ngrok localmente

### Problema: Instalador de site falha
1. Verificar logs do job no Redis
2. Confirmar que o VPS tem Ubuntu 22.04 limpo
3. Testar script manualmente

### Problema: Chat não conecta
1. Verificar Socket.IO e Redis
2. Confirmar cookies de sessão
3. Checar CORS settings

## 📝 Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] MongoDB indexes criados
- [ ] Redis rodando
- [ ] Nginx configurado
- [ ] PM2 ecosystem.config.js
- [ ] Backups automáticos configurados
- [ ] Sentry configurado
- [ ] Cloudflare API token válido
- [ ] Kiwify webhook secret configurado

## 🔗 Links Úteis
- [Documentação Técnica](./tatame.md)
- [MCP Configuration](./mcp.md)
- [API Documentation](./docs/api/)
- [Figma Designs](#)

## 💡 Dicas para Desenvolvimento

1. **Sempre** use TypeScript strict mode
2. **Nunca** faça queries diretas no MongoDB sem índices
3. **Sempre** use transações para operações críticas
4. **Cache agressivo** com React Query
5. **Lazy load** componentes pesados
6. **Optimize imagens** antes do upload
7. **Test webhooks** com ngrok primeiro
8. **Feature flags** para lançamentos graduais

## 🆘 Contatos de Emergência
- Tech Lead: [email]
- DevOps: [email]
- Suporte Kiwify: [email]