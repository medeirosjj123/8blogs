# Tarefa 26: Corrigir Problemas Essenciais da API e Ativar Rotas

*   **Arquivo**: `tasks/task26_fix_core_api_issues.md`
*   **Objetivo**: Ativar todas as rotas da API que estão importadas mas não sendo utilizadas, iniciar o worker de instalação de sites, e corrigir a configuração do CORS e da porta.
*   **Referência**: Análise de código das Tarefas 3, 7, 8, 9, 10, 11, 12, 13, 14, 15, 22, 23.

---

## Instruções de Ação:

1.  **Ativar Todas as Rotas da API**:
    *   Abra o arquivo `apps/api/src/index.ts`.
    *   Localize a seção `// API Routes`.
    *   Adicione as linhas `app.use()` para todas as rotas importadas que ainda não estão ativas. Certifique-se de que os caminhos (`/api/auth/2fa`, `/api/user`, etc.) estejam corretos.

    ```typescript
    // apps/api/src/index.ts (apenas a seção de rotas)
    // ... (imports)

    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/auth/2fa', twoFactorRoutes); // Adicionar esta linha
    app.use('/api/user', userRoutes); // Adicionar esta linha
    app.use('/api/webhooks', webhookRoutes); // Adicionar esta linha
    app.use('/api/courses', courseRoutes); // Adicionar esta linha
    app.use('/api/progress', progressRoutes); // Adicionar esta linha
    app.use('/api/chat', chatRoutes); // Adicionar esta linha
    app.use('/api/upload', uploadRoutes); // Adicionar esta linha
    app.use('/api/sites', siteRoutes); // Adicionar esta linha
    app.use('/api/stats', statsRoutes); // Corrigir o caminho para /api/stats

    // ... (restante do código)
    ```

2.  **Iniciar o Worker de Instalação de Sites**:
    *   No arquivo `apps/api/src/index.ts`, dentro da função `startServer`, adicione a chamada para iniciar o worker.

    ```typescript
    // apps/api/src/index.ts (dentro de startServer)
    // ...
    // Start BullMQ worker
    siteInstallationWorker.run(); // Adicionar esta linha
    logger.info(`🔧 Site installation worker started`);
    // ...
    ```

3.  **Ajustar Configuração do CORS**:
    *   No arquivo `apps/api/src/index.ts`, ajuste a lógica do `corsOptions.origin` para que, em produção, ele não permita origens não listadas.

    ```typescript
    // apps/api/src/index.ts (dentro de corsOptions)
    const corsOptions = {
      origin: function (origin: any, callback: any) {
        const allowedOrigins = [
          'http://localhost:5173',
          'http://localhost:5174',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174',
          // Adicione aqui as URLs de produção do frontend quando definidas
          // 'https://tatame.afiliadofaixapreta.com.br'
        ];

        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          // Em produção, rejeitar origens não permitidas
          if (process.env.NODE_ENV === 'production') {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
          } else {
            // Em desenvolvimento, permitir mas logar aviso
            logger.warn(`CORS warning: Allowing ${origin} in development mode.`);
            callback(null, true);
          }
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
      optionsSuccessStatus: 200
    };
    ```

4.  **Padronizar a Porta do Backend**:
    *   No arquivo `apps/api/src/index.ts`, ajuste a definição da porta para `3000` para consistência com o `.env` da raiz.

    ```typescript
    // apps/api/src/index.ts
    // ...
    const app: express.Application = express();
    const PORT = process.env.PORT || 3000; // Alterar para 3000
    // ...
    ```

5.  **Verificação**:
    *   Após aplicar as mudanças, reinicie o servidor backend (`pnpm dev` na raiz).
    *   Verifique os logs para confirmar que todas as rotas estão sendo montadas e que o worker foi iniciado.
    *   Teste algumas rotas de diferentes módulos (ex: `/api/user/profile`, `/api/sites/templates`) para confirmar que estão acessíveis.

## Próxima Tarefa:

Após a conclusão desta tarefa, os problemas críticos da API deverão estar resolvidos e a maioria das funcionalidades do backend ativada. A próxima etapa será a `Tarefa 27: Revisar e Detalhar as Tarefas Pendentes`.
