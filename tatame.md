# Tatame — Área de Membros (Afiliado Faixa Preta)

## 1) Objetivo

Criar a área de membros **Tatame** (`tatame.afiliadofaixapreta.com.br`) com foco em:

- **Execução**: facilitar a vida do aluno com automações práticas (instalar site WordPress + Cloudflare + template/imagem) e materiais acionáveis.
- **Comunidade mobile-first**: chat estilo Slack com canais (tópicos), DMs e threads, para interação constante.
- **Aprendizagem guiada**: trilhas do curso, progresso, gamificação por “faixas” (branca→preta) e rituais semanais (“Treinos”).
- **Escalabilidade e segurança**: arquitetura modular, logs, auditoria, tokens seguros e mínimos dados sensíveis.

---

## 2) Branding & UI/UX

**Cores**: preto (#000), branco (#FFF) e vermelho (#E10600) — referência à faixa preta de jiu-jitsu (faixa preta com barra vermelha).

**Diretrizes de UI**

- Estilo **minimalista**, foco em legibilidade, alto contraste, tipografia sem serifa.
- Componentes **shadcn/ui** + Tailwind.
- **Mobile-first** com **bottom nav** (5 ícones): Home, Curso, Comunidade, Ferramentas, Perfil.
- Microinterações discretas (Framer Motion), sombras suaves, cantos 2xl.
- Identidade: metáforas de **tatame**, **treino**, **faixas** e **rolas** (sparring) para gamificação e copy.

**Estrutura IA (informação)**

- **Dashboard**: status dos “Treinos” da semana, progresso, próximos eventos (lives), alertas e quick actions. (Tela principal, ícone "Home" na navegação). (Tela principal, ícone "Home" na navegação).
- **Curso**: módulos, lições, checklists, materiais, quizzes e certificados.
- **Comunidade (Tatame)**: canais, threads, DMs, buscas, pins.
- **Ferramentas**: Instalador de Site (WordPress + WordOps + Imagem), Cloudflare, Monitor DNS, utilitários SEO.
- **Perfil/Conta**: dados pessoais, segurança (2FA), notificações, billing/licenças.

---

## 3) Módulos (funcionalidades por área)

### 3.1) Autenticação & Acesso

- **Métodos**: email+senha, **magic link** (token de uso único com expiração curta, ex: 15 minutos), Google OAuth.
- **2FA** opcional (TOTP).
- **Sessão**: cookies com HttpOnly + SameSite=Lax, rotação de tokens (access token de curta duração + refresh token seguro para renovação).
- **RBAC** (papéis):
  - `aluno`: acesso ao conteúdo do seu plano, comunidade e ferramentas.
  - `mentor`: tudo de aluno + acesso a canais privados de mentoria e dashboards de progresso dos seus alunos.
  - `moderador`: tudo de aluno + permissões de moderação na comunidade (editar/apagar mensagens, silenciar/banir usuários).
  - `admin`: acesso total ao sistema, painéis de administração, configurações e logs.
- **Rate limit** de login e antifraude (fail2ban/app level).

### 3.2) Assinaturas / Acesso (Kiwify)

- **Gateway**: Kiwify (parcelado, Pix, etc.).
- **Webhooks** (Kiwify → Tatame): `pedido_aprovado/pago` ⇒ **grant acesso**; `pedido_cancelado/reembolso/chargeback` ⇒ **revoke acesso**; `pedido_pendente` ⇒ acesso limitado (somente módulo introdutório).
- **Segurança**: verificação obrigatória da assinatura do webhook da Kiwify em cada requisição para garantir a autenticidade.
- **Mapeamento**: `produto/variação` ↔ `plano` (ex.: Curso, Mentoria, Clube). Multiprodutos somam permissões.
- **Mapeamento de Contas**: o e-mail da Kiwify é usado para a associação inicial. Após a primeira associação, o `userId` do Tatame se torna a chave de vínculo canônica para evitar problemas com futuras alterações de e-mail.
- **SSO simples**: após compra, Kiwify redireciona para `tatame.../autologin?token=...` (token JWT curto e assinado pelo backend, com `userId` e `exp` de 5-10 minutos).
- **Recuperação de acesso**: magic link (email) + rate limit. Evitar senha na etapa inicial.
- **Admin**: tela de assinaturas com origem Kiwify, status e histórico de eventos.

### 3.3) Cursos & Conteúdo

- **Player de vídeo** (opções):
  - **Backblaze B2 + Cloudflare CDN** (recomendado pela stack atual):
    - Fase 1 (simples): MP4 progressivo, `Range requests` habilitado, URLs assinadas de curta duração (via backend, gerada sob demanda por usuário autenticado para cada requisição de vídeo) e **hotlink protection**.
    - Fase 2 (ideal): **HLS** (multi-bitrate): pré-encode 1080p/720p/480p com `ffmpeg` (workflow n8n), hospedar `.m3u8` + `.ts` no B2, player **Video.js/hls.js**, URLs assinadas.
  - **Vimeo** (fallback/zero-devops): privacidade por domínio, analytics nativos, menos controle.
- **Progresso** por lição, metas semanais (“Treinos”).
- **Quizzes** e **checklists** de execução.
- **Materiais**: download controlado + watermark nominal (PDF/IMG) opcional.
- **Otimização**: todos os materiais (PDFs, imagens) devem ser otimizados (compressão sem perdas) no upload para reduzir o tempo de carregamento e o consumo de dados.
- **Gamificação por faixas**: Branca, Azul, Roxa, Marrom, Preta (critérios claros e visíveis para o aluno: ex: "Complete o módulo X", "Instale seu primeiro site com sucesso", "Receba 10 reações na comunidade").

### 3.4) Comunidade (Slack-like)

- **Canais** temáticos (Iniciantes, SEO Técnico, Backlinks, Automação n8n, Estudos de Caso, Vitrine de Resultados, Off-topic).
- **Subcanais** ou “tópicos” fixados por módulo do curso.
- **DMs**, **threads**, **reactions**, **menções**.
- **Uploads (MVP)**: limitar a imagens (JPG/PNG) com tamanho máximo de 2MB, com compressão automática no frontend antes do envio para o backend. Outros tipos de arquivo (PDFs, etc.) podem ser adicionados depois.
- **Moderação**: silenciar, banir, remover mensagem, canais privados (mentoria/projetos).
- **Mobile-first**: bottom tabs, gestos, compositor simplificado.
- **Push Notifications (MVP)**: focar em notificações **dentro do app** (um ícone de "sininho" com um contador) para menções e DMs. A integração com OneSignal/FCM para notificações push nativas pode ser um módulo ativado pós-lançamento.
- **Busca (MVP)**: busca simples por texto em mensagens dentro do canal/conversa atual, usando as capacidades do MongoDB (`$text` index). A busca global (full-text search) pode ser uma melhoria futura com otimizações de índice.

### 3.5) Ferramentas (Execução)

**Instalador de Site (Provisionamento Seguro via Script Único)**

A abordagem prioriza a segurança e a simplicidade, eliminando a necessidade de solicitar ou armazenar credenciais do aluno (senhas ou chaves SSH). O controle é invertido: o servidor do aluno executa um script seguro fornecido pela nossa plataforma.

- **Inputs do Aluno**: IP do VPS, domínio desejado e o template a ser usado.
- **Fluxo de Provisionamento**:
  1.  **Geração do Comando Único**: A interface do Tatame gera um comando de um único uso para o aluno copiar. Ex: `curl -sL https://api.tatame.com.br/v1/provision/JOB_ID_UNICO | sudo bash`
  2.  **Execução pelo Aluno**: O aluno cola este comando em seu terminal de VPS (distribuição limpa de Ubuntu/Debian).
  3.  **Ações do Script no VPS**: O script executa as seguintes ações de forma autônoma:
      - Instala dependências necessárias (ex: WordOps).
      - **Reporta o progresso** para a API do Tatame a cada etapa (ex: "Instalando WordPress...", "Restaurando template...").
      - Baixa a imagem do template do **Servidor de Templates** centralizado.
      - **Verifica o checksum (SHA256)** do template para garantir a integridade.
      - Restaura o site.
      - Envia um sinal de "concluído" ou "erro" para a API.
  4.  **Automação Cloudflare (Centralizada)**: Em paralelo, o backend do Tatame usa a API key mestra da plataforma para:
      - Criar a zona de DNS na conta Cloudflare da empresa.
      - Apontar os records A (raiz e www) para o IP do VPS do aluno.
      - Configurar o modo SSL como "Full (Strict)".
  5.  **Status em Tempo Real**: A interface do Tatame exibe o progresso do job em tempo real para o aluno, que não precisa mais interagir com o terminal.
  6.  **Finalização**: Ao final, a interface exibe os **nameservers** da Cloudflare que o aluno deve configurar em seu registrador de domínio (Registro.br, etc.). O monitor de propagação é iniciado automaticamente.

**Curadoria de Templates**
- Todos os templates (imagens `.wpress`/Duplicator) são construídos em um ambiente limpo e seguro, mantidos pela equipe, e armazenados em um servidor de templates central. O checksum (hash SHA256) de cada template é verificado durante o processo para garantir a integridade do arquivo.

**Monitor de Propagação**

- **Nameservers**: WHOIS/RDAP vs NS da CF.
- **A record**: `dns.resolve4` em resolvers públicos (1.1.1.1, 8.8.8.8, 9.9.9.9).
- **HTTPS**: request TLS (cadeia OK + 200/3xx).
- **Cron**/fila: recheck a cada 15 min até 48h.

**Utilitários SEO (fase 2)**

- Verificador de indexação, ping sitemap, checagem de Core Web Vitals (Lighthouse API self-host ou PSI), auditor de on-page básico.

### 3.6) Suporte & Documentação

- **Help Center (MVP)**: Uma seção de FAQ simples com guias para os problemas mais comuns (instalação, DNS, Cloudflare).
- **Canal de Suporte (MVP)**: Um link direto de "Precisa de Ajuda?" (ex: `mailto:suporte@afiliadofaixapreta.com.br`) para contato direto. A automação com Typebot/WhatsApp será implementada em uma fase futura.
- **Status Page (MVP)**: Página simples com o status operacional dos serviços chave (API, Fila de Jobs, Cloudflare), atualizada manualmente no início.

### 3.7) Notificações

- **Notificações (MVP)**: O foco será em e-mails transacionais para eventos críticos, enviados via um serviço externo (ex: Resend, Mailgun) acionado pelo backend ou por webhooks via n8n. 
- **Eventos principais**: **Boas-vindas**, **Magic Link de Login**, **Job de Instalação Concluído**, **Job de Instalação com Erro**.
- As preferências de notificação e outros canais (Push, WhatsApp) são melhorias futuras.

### 3.8) Analytics & Métricas

- **Analytics (MVP)**: O painel de admin deve focar em métricas de **adoção e sucesso**. Essencial: **1) Número de usuários ativos**, **2) Número de sites instalados com sucesso**, **3) Taxa de falha dos jobs de instalação**, **4) Engajamento básico na comunidade (nº de mensagens)**.
- **Web Analytics (MVP)**: Adicionar um provedor de analytics de navegação (ex: Vercel Analytics, Google Analytics) no frontend para análise de tráfego e comportamento do usuário.
- Métricas mais complexas (cohort, NPS) ficam para fases futuras.

### 3.9) Administração

- **Administração (MVP)**: O painel de admin deve permitir as seguintes ações essenciais: **1) Buscar e visualizar um usuário**, **2) Conceder/revogar acesso manualmente (em caso de falha do webhook)**, **3) Visualizar o status e os logs de um job de instalação**, **4) Gerenciar o catálogo de templates (adicionar/remover uma imagem)**.

### 3.10) Logs & Auditoria

- **Logs (MVP)**: 
  - **1) Logs de aplicação estruturados (Pino/Winston)** para o backend, com output no console (gerenciado pelo PM2).
  - **2) Logs detalhados dos jobs de instalação**, com ofuscação de qualquer dado sensível.
  - **3) Integração com Sentry** para captura automática de erros não tratados no frontend e backend.
  - Armazenamento em nuvem (S3) é uma melhoria futura.
- **Audit Log (MVP)**: Focar em registrar apenas as ações mais críticas e sensíveis: **1) Eventos de autenticação (login, logout, falha de login)**, **2) Mudanças de permissão (concessão/revogação de acesso via Kiwify ou manual)**, **3) Início de um job de instalação de site**. Logs mais detalhados (quem viu o quê) são para o futuro.
- **Observabilidade**: Sentry (erros), OpenTelemetry (tracing), logs estruturados (Pino/Winston) → armazenamento frio (S3/Glacier) por 180–365 dias.

### 3.11) Segurança & Compliance

- **Segredos** fora do Git (dotenv + Secrets Manager).
- Hash de senha (Argon2/bcrypt), lockout progressivo.
- **Criptografia** de dados sensíveis (ex.: credenciais temporárias de acesso ao VPS do aluno; preferir ***não*** persistir senhas, apenas **chaves** e com criptografia + TTL curto).
- **CSRF**, **CORS** bem definidos, **rate limit** por IP/rota, validação de input (Zod/Yup).
- **Proteção de Enumeração**: As respostas de login e "esqueci a senha" devem ser genéricas e idênticas, independentemente de o e-mail existir ou não na base, para evitar a enumeração de usuários.
- **Backups** de BD + storage, restore testado.
- Políticas: ToS, Privacidade, AUP; ferramenta de **export/delete** de dados (LGPD/GDPR-like).

---

## 4) Stack técnica (ajustada à sua stack)

- **Frontend**: **React + Vite**, Tailwind, shadcn/ui, Framer Motion, TanStack Query.
- **Backend**: Node.js + **Express** — sem Docker.
- **DB**: **MongoDB Atlas** (Mongoose/Prisma for Mongo).
- **Tempo real**: Socket.IO (chat) com adapter Redis.
- **Queue**: Redis + BullMQ (jobs longos do instalador e monitor DNS).
- **Storage**: **Backblaze B2** (vídeos + templates) com entrega via **Cloudflare CDN** (Bandwidth Alliance), URLs pré-assinadas.
- **Auth**: Magic link por padrão; Email+senha opcional; **Google OAuth**.
- **Infra (sem Docker)**: VPS Ubuntu, **Nginx** como reverse proxy, **PM2** para processos Node, **Certbot** (se não usar TLS completo via Cloudflare), **UFW**.
- **CI/CD**: GitHub Actions (build + ssh deploy), `.env` via Ansible/rsync ou Secrets Manager.

---

## 5) Esquema de dados (alto nível)

- **users**(id, email, name, passwordHash, role, createdAt, updatedAt)
- **profiles**(userId, bio, avatarUrl, socials)
- **memberships**(userId, plan, status, kiwifyOrderId, kiwifyCustomerId, createdAt, updatedAt)
- **courses** / **modules** / **lessons** / **quizzes**
- **lessonProgress**(userId, lessonId, status, completedAt)
- **belts**(userId, belt, awardedAt, points)
- **channels** / **channelMembers** / **messages** / **threads** / **attachments** / **reactions**
- **templates**(id, name, type, sizeMb, url, checksum, description, createdAt)
- **sites**(id, userId, domain, templateId, status, jobId, nameservers, createdAt)
- **jobs**(id, siteId, templateId, state, startedAt, finishedAt)
- **jobLogs**(jobId, step, level, message, timestamp)
- **dnsChecks**(siteId, nsOk, aOk, httpsOk, lastRun)
- **auditLogs**(actorId, action, entity, entityId, meta, timestamp)
- **notifications**(userId, type, payload, readAt)

---

## 6) Fluxos principais (diagramas textuais)

**Criação de site (Fluxo com Script de Provisionamento)**

1.  `POST /api/sites` → cria job, retorna **comando único** para o aluno.
2.  Aluno executa o comando em seu VPS.
3.  O script no VPS provisiona o site e reporta o progresso para a API do Tatame.
4.  O backend, em paralelo, configura a zona na Cloudflare e exibe os nameservers para o aluno.
5.  A UI atualiza o status em tempo real e o monitor de propagação é iniciado.
6.  Quando propagado, o sistema notifica o usuário (via e-mail no MVP).

**Login e Acesso**

1.  Frontend redireciona para o endpoint de autenticação (Google OAuth ou Magic Link).
2.  Backend lida com o callback, valida as credenciais e cria uma sessão segura (HttpOnly cookie).
3.  O status da assinatura (Kiwify) é verificado para aplicar o plano correto.
4.  Permissões (RBAC) são aplicadas no backend em todas as requisições.

**Comunidade**

1.  Socket connect → autentica e inscreve o usuário nos canais.
2.  Mensagens são persistidas no **MongoDB** e eventos são emitidos em tempo real.
3.  Moderação via painel de administração.

---

## 7) Roadmap (fases)

**MVP (4–6 semanas)**

*   **Auth**: Autenticação básica (Magic Link, Google OAuth) e RBAC.
*   **Catálogo de Templates**: CRUD para gerenciar as imagens dos sites.
*   **Ferramenta**: **Instalador de Site (via Script Único)**, incluindo o monitor de propagação de DNS.
*   **Curso v1**: Listagem de módulos/lições com player de vídeo via **Vimeo** e controle de progresso básico.
*   **Comunidade v1**: Canais públicos, DMs simples, uploads de imagem (MVP) e UI mobile-first.
*   **Admin & Logs**: Painel de admin com funcionalidades essenciais e logs de jobs.
*   **Suporte e Notificações (MVP)**: Help Center simples e e-mails transacionais críticos.

**v1.1 (2–3 semanas)**

*   **Comunidade**: Threads, reações e busca simples.
*   **Segurança**: Implementação de 2FA e limites de sessão.
*   **Gamificação**: Sistema de "faixas" (belts) e "Treinos" semanais.
*   **Integração**: Webhooks da Kiwify para acesso totalmente automático.

**v2 (6–8 semanas)**

*   **Vídeo**: Migração opcional para **Backblaze B2 + HLS** para otimização de custos e maior controle.
*   **Automação de Suporte**: Integração com Typebot/WhatsApp.
*   **Notificações Avançadas**: Push notifications e central de preferências do usuário.
*   **Ferramentas SEO**: Utilitários de análise (indexação, CWV, etc.).
*   **App**: Melhorias para PWA (Progressive Web App).
*   **Analytics Avançado**: Cohort, NPS, etc.

---

## 8) QA & Confiabilidade (checklist)

*   **Scripts de reexecução idempotente**: O script de provisionamento deve verificar se o WordOps já está instalado ou se um site com o mesmo domínio já existe antes de tentar executar uma ação, evitando erros em caso de reexecução. A automação da Cloudflare deve usar "upsert" para registros de DNS.
*   **Timeouts e retries**: O script de provisionamento e as chamadas de API devem ter timeouts e retries (com exponential backoff) para lidar com instabilidades de rede.
*   **Sanitização/redaction de logs**: Garantir que nenhuma informação sensível (chaves, e-mails) seja exposta nos logs públicos dos jobs.
*   **Testes E2E (MVP)**: Focar em um único teste de ponta a ponta (ex: com Playwright) para o fluxo mais crítico: **o login e a visualização do dashboard principal**. Testes para o instalador e outras áreas podem ser adicionados progressivamente.
*   **Backups de BD**: A responsabilidade da configuração e teste dos backups (dump diário do MongoDB Atlas) é da **equipe de desenvolvimento/infra**. O processo de restauração deve ser documentado e testado trimestralmente.

---

## 9) Riscos & Mitigações

*   **Risco: Comprometimento do Servidor de Templates.**
    *   **Mitigação**: O servidor que armazena as imagens dos sites deve ser isolado, com acesso mínimo e monitorado. A verificação de checksum (SHA256) em múltiplas etapas (no upload, no B2 e antes do restore) garante a integridade dos templates.
*   **Risco: Ambiente do VPS do aluno não é o esperado.**
    *   **Mitigação**: O script de provisionamento deve, no início, verificar a versão do SO (ex: Ubuntu 22.04) e a ausência de softwares conflitantes (ex: Apache). Se o ambiente não for o ideal, o script deve parar e reportar um erro claro para a API, instruindo o aluno a começar com uma instalação limpa do SO recomendado.
*   **Risco: Falhas na API da Cloudflare.**
    *   **Mitigação**: Manusear zonas já existentes de forma idempotente (upsert), implementar retries com exponential backoff para erros de API e respeitar os rate limits.
*   **Risco: Limites dos plugins de backup (tamanho da imagem).**
    *   **Mitigação**: Usar o Duplicator, que lida melhor com imagens grandes, e garantir que os templates do MVP sejam otimizados e de tamanho razoável.
*   **Risco: Escalabilidade do chat.**
    *   **Mitigação**: Arquitetura com Socket.IO e Redis Adapter, paginação server-side de mensagens e otimização de índices no MongoDB para as queries mais frequentes.

---

## 10) Naming & Narrativa

- **Tatame** é o espaço de treino: disciplina diária, técnica e execução.
- Copys-chave: “Entre no Tatame”, “Hora do Treino”, “Rolando no ranking”, “Suba de faixa” (belts gamificados).

---

### Próximos passos sugeridos

1. Atualizar integrações para **Kiwify** (webhooks + SSO simples) e testar o ciclo grant/revoke.
2. Definir **modelo de vídeo**: B2 Fase 1 (MP4 + URLs assinadas) vs Vimeo (tempo de implementação x controle).
3. Implementar **/api/sites** + fila + Cloudflare + monitor (MVP).
4. UI base minimalista (preto/branco/vermelho), **mobile-first** com wizards (passo a passo) e textos simples (user não tech-friendly).
5. Guia de **deploy sem Docker** (Nginx + PM2 + Certbot + backups) e playbook de rollback.
6. Pilotar com 2–3 alunos (Android/iOS) e iterar UX de comunidade e instalador.

---

## 11) Guia rápido de Deploy (sem Docker)

1. VPS Ubuntu 22.04 atualizada (`apt update && apt upgrade`).
2. Instalar Node LTS, Nginx, Redis, Mongo (ou usar Atlas), PM2, Certbot.
3. Nginx reverse proxy → app Node (porta interna 3000). HSTS quando estável.
4. PM2: `pm2 start ecosystem.config.js` (watch + autorestart + logrotate).
5. Logs centralizados (Pino/Winston) + fail2ban para nginx.
6. Backups: Mongo (dump diário), Redis (RDB), `/var/www/templates` (rclone p/ B2).
7. Deploy via GitHub Actions (SSH): build, subir artefatos, `pm2 reload`.

## 12) Integração Kiwify (detalhes operacionais)

- **Webhooks**: endpoint `/api/kiwify/webhook` (verificar assinatura/secret). Eventos mínimos: `approved/paid`, `canceled/refunded`, `chargeback`, `pending`.
- **Lógica**: mapear `produtoId` → `role/plan` e conceder/revogar no banco.
- **Autologin** pós-compra: redirecionar do checkout p/ `tatame/.../autologin?token=...` (token curto assinado pelo backend do Tatame; expira em 5–10 min).
- **n8n**: duplicar eventos para automações (mensagens WhatsApp, e-mails, CRM, planilhas de acompanhamento).

## 13) Vídeo: B2 vs Vimeo (risco x simplicidade)

- **B2 + Cloudflare**: mais barato e escalável; exige **setup**: encoding (ffmpeg), URLs assinadas, player HLS, CORS, proteção anti-hotlink. Vantagem: controle total, integração com sua stack e descontos de egress via Bandwidth Alliance.
- **Vimeo**: plug-and-play, privacidade por domínio, analytics; custo maior, menos controle, risco de bloqueios por políticas.
- **Recomendação prática**: começar **B2 Fase 1 (MP4)** para ir ao ar rápido; evoluir para **HLS**. Manter **Vimeo** como fallback.

## 14) Google OAuth — Passo a passo (React + Vite + Express)

**Complexidade**: Baixa–média. É mais "chato" pela criação do app no Google Cloud do que pelo código.

**1) Console do Google Cloud**

- Criar projeto → **OAuth consent screen** (External), preencher domínio e políticas.
- Em **Credentials** → **Create Credentials** → **OAuth client ID** (tipo: Web application).
- **Authorized JavaScript origins**:
  - `https://tatame.afiliadofaixapreta.com.br`
  - `http://localhost:5173` (dev)
- **Authorized redirect URIs**:
  - `https://api.afiliadofaixapreta.com.br/auth/google/callback` (ou seu domínio de API)
  - `http://localhost:3000/auth/google/callback` (dev)
- Salvar `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

**2) Backend (Express)** — Authorization Code Flow

- Rotas:
  - `GET /auth/google` → redireciona para Google (escopos: `openid email profile`).
  - `GET /auth/google/callback` → troca `code` por tokens, valida `id_token`, cria/associa usuário, emite **sessão via cookie HttpOnly**.
- Bibliotecas: `passport` + `passport-google-oauth20` **ou** `google-auth-library` com implementação própria.
- Sessão: cookie HttpOnly + SameSite=Lax, expiração curta, rotate refresh.

**3) Frontend (React + Vite)**

- Botão **"Continuar com Google"** aponta para `/auth/google` (novo tab/popup). Após callback, backend seta cookie e redireciona para o app.
- Alternativas: **One Tap** (Google Identity Services) em fase 2.

**4) Integração com RBAC e Kiwify**

- No callback: se email confirmado ∉ base → criar user minimal (email, nome, avatar) e marcar `pending_membership`.
- Um job concilia com **Kiwify** (webhook/consulta) para **grant** de permissões.
- Se sem acesso, permitir apenas módulos públicos (ex.: boas-vindas) até confirmação.

**Boas práticas**

- Restringir **origins** e **redirects**.
- Exigir `email_verified` do Google.
- Registrar logins em **audit log**.
- Tratamento de erro claro para usuário não tech-friendly.

## 15) HIG do Tatame (Guia de Interface)

**Objetivo**: padronizar UI/UX minimalista (preto/branco/vermelho), mobile-first e acessível.

**Tokens de Design**

- **Cores**: `#000` (base), `#FFF` (fundo), `#E10600` (ação). Semânticas: sucesso `#16a34a`, aviso `#f59e0b`, erro `#b91c1c`.
- **Tipografia**: Sans (Inter/Manrope). Escala: 12/14/16/18/24/32/40/56. Peso 500-700 para títulos.
- **Espaçamento**: escala de 4px (4/8/12/16/24/32/48/64).
- **Raios**: `1rem` (16px) padrão; componentes 2xl.
- **Sombras**: sutil para elevação; foco visível (outline 2px).
- **Motion**: 150–250ms ease-out; reduza animações se `prefers-reduced-motion`.

**Componentes base (shadcn/ui)**

- Botão (primário vermelho, secundário neutro, desabilitado), Input, Select, Tabs, Sheet (mobile), Dialog, Toast.
- Navbar inferior mobile (5 itens), Header simples no desktop.
- **Wizard** de passos para ações complexas (instalador, DNS, etc.).

**Padrões UX (aluno não técnico)**

- Textos curtos, linguagem direta, **1 ação por tela**.
- Estados vazios com exemplos; checklists; confirmação visual (ícones/cores).
- Erros com solução sugerida; **botão de ajuda** visível (Typebot/WhatsApp).
- Acessibilidade: contraste AA, navegação por teclado, labels e aria-attrs.

**Documentos**

- Guia de microcopy (tom, vocabulário, exemplos).
- Biblioteca de componentes com variações e exemplos (Storybook opcional).

## 16) Checklist Senior por Áreas

**Produto/UX**
- [ ] Fechar jornadas principais (onboarding, 1º login, 1º site instalado, 1ª interação na comunidade, 1º consumo de aula).
- [ ] Definir **HIG Tatame** final (tokens Tailwind, componentes shadcn/ui, states de erro/vazio).
- [ ] Wireframes **mobile-first** (Dashboard, Curso, Comunidade, Ferramentas/Instalador, Perfil).
- [ ] Microcopy acessível e não técnica (wizards passo a passo, checklist por etapa).
- [ ] Definir gamificação (pontos/“faixas”) e critérios de evolução.
- [ ] Validar com 3–5 alunos (teste moderado remoto) e iterar.

**Frontend (React + Vite)**
- [ ] Base do app: Router, layout responsivo, TanStack Query, toasts e error boundary.
- [ ] Contexto de **auth** (magic link + cookie HttpOnly) e estado de sessão.
- [ ] Tela Login: Google OAuth + Magic Link; loading/erros claros.
- [ ] **Wizard do Instalador** (6 passos): VPS → Domínio → Template → Instalação → Cloudflare → Propagação.
- [ ] Player de vídeo (Fase 1 MP4) com retomada de progresso.
- [ ] Comunidade v1: lista de canais, canal, DMs simples, compositor, upload com preview.
- [ ] Perfil/Conta: dados, preferências de notificação, desconectar sessões.
- [ ] Tema (preto/branco/vermelho) com variantes e alto contraste (A11y AA+).

**Backend (Express)**
- [ ] **Auth**: endpoints magic link (emitir/validar), Google OAuth (callbacks), sessão HttpOnly.
- [ ] **Kiwify**: webhook `/api/kiwify/webhook` (validação de assinatura), mapping produto→plan, grant/revoke acesso.
- [ ] **Autologin** pós-compra: endpoint que gera token curto e redireciona.
- [ ] **Instalador** `/api/sites` com BullMQ; passos: SSH→WordOps→restore→Cloudflare→NS.
- [ ] **Cloudflare módulo**: criar/ler zona, upsert DNS A (root/www), SSL Full, retorno de nameservers.
- [ ] **Monitor DNS**: job periódico (15 min), WHOIS/RDAP (nameservers), `dns.resolve4` (A), HTTPS check.
- [ ] **Templates**: catálogo (CRUD), geração de URL pré-assinada B2 e verificação de checksum.
- [ ] **Logs** por etapa (redaction) + **Audit Log** (auth, permissões, ações sensíveis).
- [ ] **Notificações**: email (login, job finalizado), push web (opcional), WhatsApp via n8n (eventos críticos).

**Dados**
- [ ] Modelos MongoDB Atlas: users, profiles, memberships (⚠ atualizar campos para **Kiwify**: `kiwify_order_id`, `status`, `product_id`), courses/modules/lessons, progress, channels/messages, templates, sites/jobs, audit_logs.
- [ ] Índices: mensagens por canal/data, jobs por estado/data, users por email.
- [ ] Migrações/seed básicas (admin, canais default, templates).
- [ ] Políticas de retenção e backups (mongodump diário + restauração testada).

**Tempo real & Comunidade**
- [ ] Socket.IO + Redis adapter; autenticação por cookie/sessão.
- [ ] Estrutura de canais (públicos/privados), DMs, limites de anexo e tamanho.
- [ ] Moderação: silenciar, excluir, banir; logs de moderação.
- [ ] Busca server-side com paginação e filtros.

**Infra (sem Docker)**
- [ ] VPS Ubuntu: Nginx (reverse proxy), PM2 (ecosystem), UFW (80/443/22), Certbot.
- [ ] CI/CD GitHub Actions: build, testes, deploy via SSH, `pm2 reload`.
- [ ] Variáveis `.env` seguras (Secrets no CI); rotação de chaves periódica.
- [ ] Observabilidade: Sentry (erros), Pino/Winston (logs), métricas básicas (health/latência/filas).
- [ ] Backups: Redis RDB, arquivos templates (rclone → B2), playbook de rollback.

**Vídeo**
- [ ] Pipeline **n8n**: upload → `ffmpeg` presets (Fase 2) → publicar no B2 → limpar temporários.
- [ ] Entrega Fase 1: MP4 progressivo com **URLs assinadas** e **anti-hotlink** (CF Worker ou assinatura no backend).
- [ ] Player Video.js/hls.js preparado para HLS (Fase 2).
- [ ] Testes em redes móveis e dispositivos low-end.

**Segurança**
- [ ] Rate limit (login, webhooks, APIs sensíveis) e CORS estrito.
- [ ] CSRF para rotas de sessão; validação Zod em todas as entradas.
- [ ] Criptografia de credenciais temporárias de VPS + **TTL curto** + purge pós-job.
- [ ] Política de senhas (se usadas), 2FA opcional, lockout progressivo.
- [ ] Pentest interno: evitar RCE nos comandos remotos (whitelist de comandos), sanitização de inputs shell.

**Suporte & Conteúdo**
- [ ] Help Center inicial (FAQ instalador, DNS, Cloudflare, vídeos, Kiwify).
- [ ] Typebot/WhatsApp (Evolution API) integrado: triagem e criação de tickets.
- [ ] Base de conhecimento dinâmica (n8n gera artigos de dúvidas recorrentes).

**Legal/Políticas**
- [ ] Termos de Uso, Privacidade (LGPD-like), Política de Uso Aceitável.
- [ ] Consentimento para tratamento de dados (cookies, e-mail, WhatsApp).
- [ ] Processo de **exportação/remoção** de dados do usuário.

**Lançamento**
- [ ] Beta fechado (20–30 alunos) com metas de sucesso (ex.: 80% instalaram site em 24h).
- [ ] Telemetria de UX e performance; ajustes semanais.
- [ ] Plano de comunicação (email, WhatsApp, live de onboarding), tutoriais rápidos.
- [ ] Roadmap público simplificado e canal de feedback.

---

## 17) SEO Suite — Ferramentas (0 a 7)

**0) Configurador de Site**
- Reuso do Instalador (WordOps + Template + Cloudflare). Expor como "Configurar novo site" dentro da aba Ferramentas.
- **Endpoint**: `POST /api/sites` (já descrito). **UI**: wizard 6 passos com validações e textos simples.

**1) Silo Organizer (cluster por SERP)**
- **Input**: CSV (keywords, volume, intenção opcional). Upload → parse → normalização (lowercase, trim, PT-BR locale).
- **Provider SERP**: Abstrair camada (Google Programmable Search, SerpAPI ou DataForSEO). Selecionar 1 para o MVP.
- **Coleta**: Top 10 URLs por keyword. Extrair **hostname** e caminho.
- **Similaridade**: Jaccard sobre conjuntos de hostnames/URLs. **Threshold** ≥ 0.8 (80%).
- **Agrupamento**: grafo por similaridade (arestas ≥ threshold) + **union-find** para clusters. Escolher **keyword canônica** por maior volume ou forma mais natural.
- **Saída**: tabela com `cluster_id`, `canonical_kw`, `variants[]`, `volume_total`, `intenção`. Export CSV/Google Sheets.
- **Anti-canibalização**: flag se duas keywords do mesmo cluster já têm post publicado no projeto.
- **Rate-limit** e **cache** de SERP; reprocessamento incremental.

**2) Outlines (top-5 concorrentes)**
- **Fetch**: coletar URLs do top-5 (por cluster). Baixar HTML.
- **Parser**: Cheerio/JSdom para extrair H1–H3, listas e breadcrumbs; remover boilerplate/nav/rodapé.
- **Unificação**: normalizar headings, agrupar semântica (sinônimos), ordenar por intenção (informacional/comercial) e **arquitetura** (intro→tarefas→FAQs→conclusão).
- **Heurísticas**: garantir seções E-E-A-T (autor, fontes), FAQs (People Also Ask), e bloco de CTAs.
- **Saída**: outline "limpa" com profundidade e notas por seção. Export para editor.

**3) Escrever Artigos**
- **Fonte**: outline + cluster. Gerar conteúdo com **provedor LLM** (abstraído) + ajustes manuais.
- **Imagens**: **Pexels API** (free) por seção (query do subtítulo). Baixar e inserir com **legendas ALT** geradas por IA. Guardar créditos/links.
- **SEO**: metatitle, description, schema (Article/FAQ), slug, links internos sugeridos via cluster.
- **Publicação**: enviar para WordPress via REST (autenticado). Opção **Rascunho/Agendar**.

**4) Checklist (gamificado)**
- **Coleções** por jornada: Configurar Site, Publicar 1º Artigo, SEO On-page, Backlinks, Monetização.
- **Recursos**: metas semanais, streaks, badges por faixa. Marcação de concluído com dicas inline.
- **Admin**: criar/editar templates de checklist e atribuir por projeto/usuário.

**5) Calculadora de Rendimento**
- **Entradas**: lista de keywords (volume, CPC opcional), **CTR por posição** (tabela padrão editável), **CR** (conversão) e **ticket/CPA** médio, EPMV para Ads.
- **Cálculos**: tráfego = Σ(volume*CTR*share); receita afiliado = tráfego*CR*ticket; receita Ads = pageviews*EPMV/1000.
- **Cenários**: conservador/realista/agressivo (sliders de CTR/CR/ticket). Exportar relatório.

**6) Overview de Projeto**
- **Dashboard** por projeto: keywords (clusters), artigos feitos/pendentes, progresso do checklist, status DNS/SSL, estimativas da calculadora, próximos passos.
- **Filtros**: por status, por cluster, por data. Links rápidos para editar no WP.

**7) Kanban**
- **Colunas padrão**: Backlog → Briefing → Em Produção → Revisão → Publicar → Atualizar.
- **Cartões**: vinculados a keywords/clusters/outlines, responsáveis, prazos, checklist embutido.
- **Ações rápidas**: criar post no WP como rascunho; mover coluna = atualizar status no banco.

---

## 18) Dados & Endpoints (SEO Suite)

**Coleções Mongo (novas/estendidas)**
- `projects`(id, user_id, domain, created_at, status)
- `keywords`(id, project_id, text, volume, intent, serp_cache, created_at)
- `clusters`(id, project_id, canonical_kw, keyword_ids[], volume_total, created_at)
- `outlines`(id, project_id, cluster_id, sections[], sources[], created_at)
- `articles`(id, project_id, cluster_id, wp_post_id?, status, scheduled_at, published_at)
- `checklists`(id, name, items[])
- `user_checklists`(id, user_id, project_id, checklist_id, progress[])
- `estimates`(id, project_id, inputs{ctr,cr,ticket,epmv}, outputs{trafego,receita}, scenario)
- `kanban_boards`/`kanban_cards`

**Endpoints (exemplos)**
- `POST /api/projects` | `GET /api/projects/:id`
- `POST /api/keywords/upload` (CSV) → job de SERP & cluster
- `GET /api/clusters?project_id=...`
- `POST /api/outlines/:clusterId/generate`
- `POST /api/articles/:clusterId/draft` (gera + envia pro WP)
- `POST /api/checklists/assign` (template → user/project)
- `POST /api/estimates/calc` (retorna 3 cenários)
- `GET /api/overview/:projectId`
- `GET /api/kanban/:projectId` | `POST /api/kanban/card`

---

## 19) Sprint até Terça (lançamento)
**Hoje (Sexta)**
- [ ] Setup projeto (repo, CI, ambientes), tokens (Cloudflare, B2, Pexels, SERP provider), `.env`.
- [ ] Auth básico: Magic Link; stub do Google OAuth.
- [ ] UI base + tema + navbar mobile; criar página **Ferramentas** e **Projetos**.
- [ ] **0) Configurador de Site** funcional do começo ao fim (sem Origin CA): WordOps + Template (AI1WM pequeno) + Cloudflare (zona + A + SSL Full) + NS na tela.

**Sábado**
- [ ] **1) Silo Organizer** MVP: upload CSV, coletar SERP (Top10), cluster por Jaccard 0.8, export CSV.
- [ ] **Monitor DNS** ativado (cron 15min) + tela de status por site.
- [ ] **6) Overview de Projeto**: lista de projetos + cards com KPIs iniciais.

**Domingo**
- [ ] **2) Outlines** MVP: extrair H1–H3 dos top5, unificar, mostrar editor simples.
- [ ] **7) Kanban** básico: colunas padrão + criação/movimentação de cartões.
- [ ] Integração **Kiwify webhook** (grant/revoke) mínima.

**Segunda**
- [ ] **3) Escrever Artigos** (rascunho): gerar texto base por outline (LLM provider) + inserir 1–2 imagens Pexels + enviar rascunho ao WP.
- [ ] **4) Checklist**: atribuir template "Primeira Semana" ao projeto e marcar progresso.
- [ ] **5) Calculadora**: formulário + 3 cenários (usar CTR padrão + inputs editáveis).
- [ ] Polimento de UI, textos, vazios; testes E2E mínimos; preparar demo.

**Terça de manhã (lançamento)**
- [ ] Smoke tests; criar 1 site ao vivo durante a demo.
- [ ] Plano de contingência: desativar features via **feature flags** se algo quebrar (manter Configurador + Silo + Outlines online).

---

## 20) Dependências & Chaves (bloqueios)
- **Cloudflare API Token**, **B2 Key/Secret**, **Pexels API Key**.
- **SERP Provider** (CSE ID + API key *ou* SerpAPI/DataForSEO).
- **Kiwify webhook secret**.
- Credenciais WordPress padrão para publicação.

---

## 21) Riscos específicos (SEO Suite)
- Quota/limite do provedor de SERP → implementar **fila** + **cache** + reprocessamento.
- Mudanças de layout em páginas concorrentes (parser) → usar heurísticas robustas e fallback.
- Conteúdo duplicado por IA → checagem de similaridade e ajustes humanos.
- Pexels rate-limit → cache local e backoff.

---