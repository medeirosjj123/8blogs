# Tarefa 3: Inicializar a Aplicação Backend (`apps/api`)

*   **Arquivo**: `tasks/task3_initialize_backend.md`
*   **Objetivo**: Estabelecer a base da aplicação backend Express.js, que será o coração da lógica de negócio do Tatame.
*   **Referência no `tatame.md`**: Seção "4.1) Stack Principal" -> "Backend: Node.js + Express".

---

## Instruções de Ação:

1.  **Estruturar o Diretório da Aplicação**:
    *   Crie o diretório principal para a aplicação backend (`apps/api`) dentro do monorepo.

2.  **Configurar o Projeto Backend**:
    *   Inicialize o `package.json` para a aplicação backend.
    *   Adicione as dependências essenciais para um servidor Express.js, incluindo um logger e suporte a TypeScript.

3.  **Configurar o Ambiente de Desenvolvimento TypeScript**:
    *   Crie o arquivo `tsconfig.json` para o backend, configurando o compilador TypeScript e garantindo que ele possa resolver módulos e tipos de forma adequada dentro do monorepo.

4.  **Desenvolver o Ponto de Entrada da Aplicação**:
    *   Crie o arquivo principal da aplicação (`src/index.ts`).
    *   Configure um servidor Express.js básico que escute em uma porta definida.
    *   Integre um sistema de logging para registrar as requisições e eventos do servidor.
    *   Crie uma rota de teste simples para verificar o funcionamento.

5.  **Integrar Scripts de Execução**:
    *   Adicione scripts ao `package.json` do backend para facilitar o desenvolvimento (`dev`), a compilação (`build`) e a execução em produção (`start`).
    *   Certifique-se de que o `turbo.json` na raiz do monorepo esteja configurado para reconhecer e executar esses scripts para a aplicação `api`.

6.  **Verificar o Funcionamento do Backend**:
    *   Inicie o servidor backend através do comando unificado do monorepo.
    *   Confirme que o servidor está ativo, que as mensagens de log são exibidas corretamente e que a rota de teste responde conforme o esperado.

## Próxima Tarefa:

Após a conclusão desta tarefa, você estará pronto para a `Tarefa 4: Inicializar a Aplicação Frontend (apps/web)`.