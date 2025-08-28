# 🚀 Guia de Uso - Tatame Platform

Este guia fornece instruções completas para configurar, executar e usar a plataforma Tatame.

## 📋 Pré-requisitos

Certifique-se de ter instalado:

- **Node.js** v18+ (recomendado v20+)
- **pnpm** v8+ (`npm install -g pnpm`)
- **MongoDB** (local ou MongoDB Atlas)
- **Redis** (local ou cloud)
- **Git**

## 🔧 Configuração Inicial

### 1. Instalar Dependências

Na raiz do projeto, execute:

```bash
# Instalar todas as dependências do monorepo
pnpm install
```

### 2. Configurar Variáveis de Ambiente

#### Backend (apps/api/.env)

Copie o arquivo de exemplo e configure suas variáveis:

```bash
# Copiar template
cp .env.example apps/api/.env

# Editar com suas configurações
nano apps/api/.env
```

Configurações essenciais:

```env
# MongoDB (obrigatório)
MONGODB_URI=mongodb+srv://seu-usuario:sua-senha@cluster.mongodb.net/tatame

# Redis (obrigatório para chat e filas)
REDIS_URL=redis://localhost:6379

# Portas
PORT=3000
FRONTEND_URL=http://localhost:5173

# Segurança (gere suas próprias chaves!)
JWT_SECRET=sua-chave-secreta-super-segura-mude-isso
SESSION_SECRET=outra-chave-secreta-mude-isso
MAGIC_LINK_SECRET=mais-uma-chave-secreta-mude-isso

# Kiwify (opcional no desenvolvimento)
KIWIFY_WEBHOOK_SECRET=seu-secret-do-kiwify

# Cloudflare (opcional no desenvolvimento)
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
```

#### Frontend (apps/web/.env)

```bash
cp apps/web/.env.example apps/web/.env
```

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## 🎯 Executando o Projeto

### Modo Desenvolvimento (Recomendado)

#### Opção 1: Executar Tudo de Uma Vez

```bash
# Na raiz do projeto
pnpm dev
```

Isso iniciará:
- Backend API em http://localhost:3000
- Frontend em http://localhost:5173
- MCP Server em http://localhost:3333

#### Opção 2: Executar Serviços Individualmente

```bash
# Terminal 1 - Backend API
cd apps/api
pnpm dev

# Terminal 2 - Frontend
cd apps/web
pnpm dev

# Terminal 3 - MCP Server (opcional)
pnpm mcp:dev
```

### Serviços Externos Necessários

#### Redis (para Chat e Filas)

```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:alpine
```

#### MongoDB (se usando local)

```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Docker
docker run -d -p 27017:27017 mongo:latest
```

## 📱 Acessando a Aplicação

### URLs Principais

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Health Check**: http://localhost:3000/health
- **API Docs**: http://localhost:3000/api
- **MCP Context**: http://localhost:3333/v1/context/project

### Primeiro Acesso

1. **Criar Conta**:
   - Acesse http://localhost:5173
   - Clique em "Criar Conta"
   - Use email e senha (mínimo 8 caracteres, 1 maiúscula, 1 número, 1 especial)

2. **Login**:
   - Email + Senha
   - Ou solicite Magic Link

## 🧪 Testando Funcionalidades

### 1. Autenticação

```bash
# Registro
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","password":"Test123!@#","name":"Teste"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","password":"Test123!@#"}'

# Magic Link
curl -X POST http://localhost:3000/api/auth/request-magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com"}'
```

### 2. Chat/Comunidade

```bash
# Listar canais (precisa de token)
TOKEN="seu-jwt-token"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/chat/channels

# Criar canal
curl -X POST http://localhost:3000/api/chat/channels \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Meu Canal","description":"Descrição","type":"public"}'
```

### 3. Cursos

```bash
# Listar cursos públicos
curl http://localhost:3000/api/courses

# Ver detalhes do curso (autenticado)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/courses/[course-id]
```

### 4. Instalador de Sites

```bash
# Listar templates
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/sites/templates

# Criar instalação
curl -X POST http://localhost:3000/api/sites \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "meusite.com",
    "ipAddress": "192.168.1.100",
    "templateId": "starter-blog"
  }'
```

## 🛠️ Comandos Úteis

### Build para Produção

```bash
# Build completo
pnpm build

# Build específico
pnpm --filter @tatame/api build
pnpm --filter @tatame/web build
```

### Linting e Type Checking

```bash
# Lint em todos os projetos
pnpm lint

# Type check
pnpm check-types

# Formatar código
pnpm format
```

### Testes

```bash
# Executar testes (quando implementados)
pnpm test

# Testes com coverage
pnpm test:coverage
```

### Limpeza

```bash
# Limpar node_modules e caches
pnpm clean

# Reinstalar dependências
pnpm clean && pnpm install
```

## 📊 Monitoramento

### Logs

Os logs são exibidos no terminal com formatação colorida (pino-pretty).

Para produção, configure o Sentry:
```env
SENTRY_DSN=sua-dsn-do-sentry
```

### Status dos Serviços

- **API Health**: http://localhost:3000/health
- **Database Status**: Incluído no health check
- **Redis**: `redis-cli ping`
- **Jobs Queue**: Logs do BullMQ no terminal

## 🐛 Troubleshooting

### Erro: "MongoDB connection failed"

1. Verifique se o MongoDB está rodando
2. Confirme a string de conexão no `.env`
3. Se usando Atlas, verifique whitelist de IPs

### Erro: "Redis connection refused"

1. Inicie o Redis: `redis-server`
2. Verifique a porta: `redis-cli ping`
3. Confirme `REDIS_URL` no `.env`

### Erro: "Port already in use"

```bash
# Encontrar processo na porta
lsof -i :3000

# Matar processo
kill -9 [PID]

# Ou mudar a porta no .env
PORT=3001
```

### Erro: "Cannot find module '@tatame/types'"

```bash
# Rebuild dos pacotes compartilhados
pnpm --filter @tatame/types build
pnpm --filter @tatame/config build
```

## 🚀 Deploy

### Preparação para Produção

1. **Variáveis de Ambiente**:
   - Use valores seguros para todas as secrets
   - Configure URLs de produção
   - Ative serviços externos (Cloudflare, Kiwify, etc)

2. **Build**:
```bash
pnpm build
```

3. **Iniciar em Produção**:
```bash
NODE_ENV=production pnpm start
```

### Docker (Opcional)

```bash
# Build da imagem
docker build -t tatame-platform .

# Executar container
docker run -p 3000:3000 --env-file .env tatame-platform
```

## 📚 Recursos Adicionais

### Estrutura do Projeto

```
tatame/
├── apps/
│   ├── api/          # Backend Node.js/Express
│   └── web/          # Frontend React/Vite
├── packages/
│   ├── types/        # TypeScript types compartilhados
│   └── config/       # Configurações compartilhadas
├── uploads/          # Arquivos enviados (dev only)
└── tasks/           # Documentação de tarefas
```

### APIs Principais

- `/api/auth/*` - Autenticação
- `/api/user/*` - Perfil do usuário
- `/api/courses/*` - Sistema de cursos
- `/api/chat/*` - Chat/Comunidade
- `/api/sites/*` - Instalador de sites
- `/api/webhooks/*` - Webhooks externos

### WebSocket Events

- `join:channel` - Entrar em canal
- `send:message` - Enviar mensagem
- `typing:start/stop` - Indicador de digitação
- `new:message` - Nova mensagem recebida

## 💡 Dicas de Desenvolvimento

1. **Use o MCP Server** para contexto AI ao desenvolver
2. **Monitore os logs** para debug em tempo real
3. **Use Postman/Insomnia** para testar APIs
4. **Redis Commander** para visualizar filas e cache
5. **MongoDB Compass** para gerenciar banco de dados

## 🆘 Suporte

- Documentação: `/tatame.md`
- Tasks: `/tasks/*.md`
- Issues: GitHub Issues
- Logs: Terminal ou arquivos em `/logs` (produção)

---

**Boa sorte com o desenvolvimento! 🎯**