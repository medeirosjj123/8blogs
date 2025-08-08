# Tarefa 5: Configurar o Pacote de Tipos Compartilhados (`packages/types`)

*   **Arquivo**: `tasks/task5_setup_shared_types.md`
*   **Objetivo**: Criar um pacote TypeScript dedicado a definir e compartilhar tipos e interfaces entre as aplicações frontend e backend, garantindo consistência de dados em todo o monorepo.
*   **Referência no `tatame.md`**: Seção "4.2) Arquitetura do Código: Monorepo com Turborepo" -> `packages/types/`.

---

## Instruções de Ação:

1.  **Preparar o Diretório do Pacote**:
    *   Remova qualquer pacote de exemplo que possa ter sido criado pelo Turborepo no diretório `packages/` que não seja relevante para tipos.
    *   Crie o diretório principal para o pacote de tipos (`packages/types`) dentro do monorepo.

2.  **Configurar o Projeto do Pacote de Tipos**:
    *   Inicialize o `package.json` para o pacote de tipos, garantindo que seu nome siga a convenção de pacotes internos do monorepo (ex: `@tatame/types`).
    *   Adicione as dependências necessárias para compilação TypeScript.

3.  **Configurar o Ambiente de Desenvolvimento TypeScript**:
    *   Crie o `tsconfig.json` para o pacote de tipos, configurando-o para gerar arquivos de declaração (`.d.ts`) que serão usados pelas outras aplicações.

4.  **Definir Tipos Essenciais**: 
    *   Crie um arquivo principal (`src/index.ts`) dentro do pacote de tipos.
    *   Defina tipos e interfaces que serão comumente usados tanto no frontend quanto no backend (ex: `IUser`, `ApiResponse`).

5.  **Integrar o Pacote de Tipos às Aplicações**:
    *   Adicione o pacote de tipos (`@tatame/types`) como uma dependência nas aplicações `apps/api` e `apps/web`.
    *   Verifique se os `tsconfig.json` de `apps/api` e `apps/web` estão configurados para resolver corretamente os caminhos para este pacote.

6.  **Verificar a Compartilhamento de Tipos**:
    *   Em ambas as aplicações (frontend e backend), importe e utilize um tipo definido no pacote `packages/types`.
    *   Execute os processos de desenvolvimento (`dev`) e compilação (`build`) para ambas as aplicações para confirmar que não há erros de tipo e que as importações funcionam corretamente.

## Próxima Tarefa:

Após a conclusão desta tarefa, você estará pronto para a `Tarefa 6: Configurar o Pacote de Configurações Compartilhadas (packages/config)`.