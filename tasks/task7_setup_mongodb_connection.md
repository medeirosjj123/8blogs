# Tarefa 7: Configurar Conexão com MongoDB Atlas

*   **Arquivo**: `tasks/task7_setup_mongodb_connection.md`
*   **Objetivo**: Estabelecer a conexão do backend com o MongoDB Atlas, que será o banco de dados principal do projeto Tatame.
*   **Referência no `tatame.md`**: Seção "4.1) Stack Principal" -> "DB: MongoDB Atlas".

---

## Instruções de Ação:

1.  **Preparar o Banco de Dados no MongoDB Atlas**:
    *   Crie ou configure um cluster no MongoDB Atlas.
    *   Configure as permissões de acesso à rede e crie um usuário de banco de dados.
    *   Obtenha a string de conexão (URI) para o seu cluster.

2.  **Adicionar Dependências do MongoDB ao Backend**:
    *   No diretório da aplicação backend (`apps/api`), adicione as bibliotecas necessárias para interagir com o MongoDB (Mongoose) e para gerenciar variáveis de ambiente (`dotenv`).

3.  **Gerenciar Variáveis de Ambiente**:
    *   Na raiz do monorepo, crie um arquivo `.env` para armazenar a string de conexão do MongoDB e outras variáveis sensíveis. **Lembre-se de que este arquivo não deve ser versionado no Git.**
    *   Crie um arquivo `.env.example` (que será versionado) para servir como template para outros desenvolvedores.

4.  **Configurar a Conexão no Backend**:
    *   No ponto de entrada da aplicação backend (`apps/api/src/index.ts`), adicione a lógica para carregar as variáveis de ambiente e estabelecer a conexão com o MongoDB usando a URI fornecida.
    *   Garanta que o servidor Express.js só inicie após a conexão bem-sucedida com o banco de dados.

5.  **Verificar a Conexão com o Banco de Dados**:
    *   Inicie o servidor backend.
    *   Confirme nos logs que a conexão com o MongoDB foi estabelecida com sucesso.

## Próxima Tarefa:

Após a conclusão desta tarefa, você estará pronto para a `Tarefa 8: Implementar o Módulo de Autenticação (Email+Senha e Magic Link)`.