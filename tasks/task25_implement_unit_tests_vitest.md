# Tarefa 25: Implementar o Módulo de Testes Unitários (Vitest)

*   **STATUS**: **NÃO CONCLUÍDA**
*   **Objetivo**: Configurar o ambiente de testes unitários usando Vitest e criar testes para componentes e funções críticas do projeto.
*   **Referência no `tatame.md`**: Seção "8) QA & Confiabilidade (checklist)".
*   **Referência no `mcp.md`**: Seção "2. Servidores MCP para Testes" -> "Servidor de Testes Unitários (`vitest/mcp`)".

---

## Instruções de Ação:

Este módulo será implementado em etapas, focando na cobertura de código e na qualidade.

---

#### **25.1. Subtarefa: Configurar o Ambiente Vitest no Monorepo**

1.  **Objetivo**: Instalar e configurar o Vitest para rodar testes unitários no projeto.
2.  **Ação**:
    *   Na raiz do monorepo, instale o Vitest e as dependências de teste para React (se aplicável):
        ```bash
        pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom
        ```
    *   Crie um arquivo de configuração Vitest (`vitest.config.ts`) na raiz do monorepo, configurando-o para o ambiente Node.js e/ou JSDOM (para testes de React).
    *   Adicione scripts de teste ao `package.json` da raiz e dos `apps` para facilitar a execução.
    *   **Verificação**: Execute um comando básico do Vitest (ex: `npx vitest --version`) para confirmar a instalação.

---

#### **25.2. Subtarefa: Criar o Servidor MCP para Vitest**

1.  **Objetivo**: Integrar o servidor MCP do Vitest para expor o contexto dos testes unitários.
2.  **Ação**:
    *   Instale o pacote `@mcp/vitest` como dependência de desenvolvimento na raiz do monorepo.
    *   Adicione um script ao `package.json` da raiz para iniciar o servidor MCP do Vitest (ex: `pnpm mcp:vitest`).
    *   **Verificação**: Inicie o servidor e acesse a URL padrão do MCP para Vitest (geralmente `http://localhost:3335/v1/context/tests`) para confirmar que ele está ativo.

---

#### **25.3. Subtarefa: Implementar Testes Unitários para Funções Críticas do Backend**

1.  **Objetivo**: Criar testes unitários para funções utilitárias e controladores do backend.
2.  **Ação**:
    *   No diretório `apps/api`, crie um diretório `__tests__` ou `tests`.
    *   Escreva testes para funções como `hashPassword` e `comparePassword` (do módulo de autenticação).
    *   **Verificação**: Execute os testes Vitest e confirme que eles passam com sucesso.

---

#### **25.4. Subtarefa: Implementar Testes Unitários para Componentes Críticos do Frontend**

1.  **Objetivo**: Criar testes unitários para componentes React importantes do frontend.
2.  **Ação**:
    *   No diretório `apps/web`, crie um diretório `__tests__` ou `tests`.
    *   Escreva testes para componentes como o `BottomNav` ou outros componentes de UI críticos.
    *   **Verificação**: Execute os testes Vitest e confirme que eles passam com sucesso.

## Próxima Tarefa:

Após a conclusão desta tarefa, o módulo de testes unitários estará funcional. Esta é a última tarefa do **Marco 1: Lançamento do Tatame (A Plataforma) - MVP**.