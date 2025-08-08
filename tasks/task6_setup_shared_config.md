# Tarefa 6: Configurar o Pacote de Configurações Compartilhadas (`packages/config`)

*   **Arquivo**: `tasks/task6_setup_shared_config.md`
*   **Objetivo**: Criar um pacote dentro do monorepo para centralizar configurações de ferramentas como ESLint e TypeScript, garantindo consistência e padronização em todo o projeto.
*   **Referência no `tatame.md`**: Seção "4.2) Arquitetura do Código: Monorepo com Turborepo" -> `packages/config/`.

---

## Instruções de Ação:

1.  **Preparar o Diretório do Pacote**:
    *   Remova qualquer pacote de configuração de exemplo que possa ter sido criado pelo Turborepo.
    *   Crie o diretório principal para o pacote de configurações (`packages/config`) dentro do monorepo.

2.  **Configurar o Projeto do Pacote de Configurações**:
    *   Inicialize o `package.json` para o pacote de configurações, garantindo que seu nome siga a convenção de pacotes internos do monorepo (ex: `@tatame/config`).
    *   Adicione as dependências necessárias para as ferramentas de linting e formatação (ESLint, Prettier, plugins TypeScript e React).

3.  **Definir Configurações Base do ESLint**: 
    *   Crie um arquivo principal para o ESLint (`index.js`) dentro do pacote de configurações.
    *   Configure as regras base do ESLint, incluindo suporte a TypeScript e React, e integração com Prettier.

4.  **Definir Configurações Base do TypeScript**: 
    *   Crie um arquivo `tsconfig.base.json` dentro do pacote de configurações.
    *   Defina as opções de compilador TypeScript que serão comuns a todas as aplicações do monorepo.

5.  **Integrar o Pacote de Configurações às Aplicações**:
    *   Adicione o pacote de configurações (`@tatame/config`) como uma dependência de desenvolvimento nas aplicações `apps/api` e `apps/web`.
    *   Configure os arquivos `.eslintrc.cjs` e `tsconfig.json` de cada aplicação para estenderem as configurações definidas no pacote `packages/config`.

6.  **Verificar a Consistência das Configurações**:
    *   Execute os comandos de lint e build do monorepo.
    *   Confirme que as regras de linting são aplicadas corretamente e que as aplicações compilam sem erros, utilizando as configurações compartilhadas.

## Próxima Tarefa:

Após a conclusão desta tarefa, você terá a estrutura básica do monorepo com configurações compartilhadas. A próxima etapa será começar a implementar as funcionalidades do projeto.