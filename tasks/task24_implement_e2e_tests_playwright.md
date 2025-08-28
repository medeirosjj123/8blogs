# Tarefa 24: Implementar o Módulo de Testes E2E (Playwright)

*   **STATUS**: **NÃO CONCLUÍDA**
*   **Objetivo**: Configurar o ambiente de testes End-to-End (E2E) usando Playwright e criar um teste crítico para o fluxo de login.
*   **Referência no `tatame.md`**: Seção "8) QA & Confiabilidade (checklist)" -> "Testes E2E (MVP)".
*   **Referência no `mcp.md`**: Seção "2. Servidores MCP para Testes" -> "Servidor de Testes E2E (`playwright/mcp`)".

---

## Instruções de Ação:

Este módulo será implementado em etapas, focando na cobertura do fluxo mais crítico.

---

#### **24.1. Subtarefa: Configurar o Ambiente Playwright no Monorepo**

1.  **Objetivo**: Instalar e configurar o Playwright para rodar testes E2E no projeto.
2.  **Ação**:
    *   Na raiz do monorepo, instale o Playwright:
        ```bash
        pnpm add -D playwright
        ```
    *   Configure o Playwright para instalar os browsers necessários:
        ```bash
        npx playwright install
        ```
    *   Crie um diretório `e2e` na raiz do monorepo para os testes E2E.
    *   Crie um arquivo de configuração Playwright (`playwright.config.ts`) na raiz do monorepo, configurando-o para apontar para a URL do frontend e para o diretório de testes.
    *   **Verificação**: Execute um comando básico do Playwright (ex: `npx playwright --version`) para confirmar a instalação.

---

#### **24.2. Subtarefa: Criar o Servidor MCP para Playwright**

1.  **Objetivo**: Integrar o servidor MCP do Playwright para expor o contexto dos testes.
2.  **Ação**:
    *   Instale o pacote `@mcp/playwright` como dependência de desenvolvimento na raiz do monorepo.
    *   Adicione um script ao `package.json` da raiz para iniciar o servidor MCP do Playwright (ex: `pnpm mcp:playwright`).
    *   **Verificação**: Inicie o servidor e acesse a URL padrão do MCP para Playwright (geralmente `http://localhost:3334/v1/context/tests`) para confirmar que ele está ativo.

---

#### **24.3. Subtarefa: Implementar Teste E2E para o Fluxo de Login**

1.  **Objetivo**: Criar um teste automatizado que simule o fluxo de login de um usuário.
2.  **Ação**:
    *   No diretório `e2e`, crie um arquivo de teste (ex: `login.spec.ts`).
    *   Escreva o teste Playwright que:
        *   Navegue para a página de login do frontend.
        *   Preencha os campos de e-mail e senha.
        *   Clique no botão de login.
        *   Verifique se o usuário é redirecionado para o dashboard e se elementos específicos do dashboard são visíveis.
    *   **Verificação**: Execute o teste Playwright e confirme que ele passa com sucesso.

## Próxima Tarefa:

Após a conclusão desta tarefa, o módulo de testes E2E estará funcional. A próxima etapa será a `Tarefa 25: Implementar o Módulo de Testes Unitários (Vitest)`.