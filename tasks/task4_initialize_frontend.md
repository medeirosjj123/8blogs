# Tarefa 4: Inicializar a Aplicação Frontend (`apps/web`)

*   **Arquivo**: `tasks/task4_initialize_frontend.md`
*   **Objetivo**: Estabelecer a base da aplicação React com Vite, que será a interface do usuário do Tatame.
*   **Referência no `tatame.md`**: Seção "4.1) Stack Principal" -> "Frontend: React + Vite".

---

## Instruções de Ação:

1.  **Preparar o Diretório da Aplicação**:
    *   Remova qualquer estrutura de frontend de exemplo que possa ter sido criada pelo Turborepo.
    *   Crie o diretório principal para a aplicação frontend (`apps/web`) dentro do monorepo.

2.  **Inicializar o Projeto Frontend**:
    *   Utilize a ferramenta de inicialização do Vite para criar um novo projeto React com TypeScript dentro do diretório `apps/web`.
    *   Instale as dependências geradas pelo Vite para o projeto frontend.

3.  **Configurar o Ambiente de Desenvolvimento TypeScript**:
    *   Ajuste o `tsconfig.json` do frontend para garantir que o compilador TypeScript funcione corretamente no contexto do monorepo e possa resolver módulos e tipos de forma adequada.

4.  **Integrar Scripts de Execução**:
    *   Verifique e, se necessário, ajuste os scripts no `package.json` do frontend para desenvolvimento (`dev`), compilação (`build`) e pré-visualização (`preview`).
    *   Certifique-se de que o `turbo.json` na raiz do monorepo esteja configurado para reconhecer e executar esses scripts para a aplicação `web`.

5.  **Verificar o Funcionamento do Frontend**:
    *   Inicie o servidor de desenvolvimento do frontend através do comando unificado do monorepo.
    *   Confirme que a aplicação React padrão é exibida corretamente no navegador.

## Próxima Tarefa:

Após a conclusão desta tarefa, você estará pronto para a `Tarefa 5: Configurar o Pacote de Tipos Compartilhados (packages/types)`.