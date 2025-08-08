# Tarefa 2: Configurar o Servidor MCP Principal

*   **Arquivo**: `tasks/task2_setup_mcp_server.md`
*   **Objetivo**: Integrar o Model Context Protocol (MCP) ao projeto para que ferramentas de IA possam entender o contexto técnico do Tatame de forma estruturada.
*   **Referência no `mcp.md`**: Seção "1. Servidores MCP Essenciais para o MVP" -> "Servidor Principal do Projeto (`mcp/server`)".

---

## Instruções de Ação:

1.  **Adicionar a Dependência do Servidor MCP**:
    *   Inclua o pacote `@mcp/server` como uma dependência de desenvolvimento na raiz do seu monorepo.

2.  **Criar o Arquivo de Configuração do MCP**:
    *   Crie um arquivo de configuração (`mcp.config.js`) na raiz do monorepo.
    *   Preencha este arquivo com as informações essenciais do projeto (nome, versão, descrição, stack, referências aos documentos principais), conforme a especificação do MCP.

3.  **Adicionar Script para Iniciar o Servidor MCP**:
    *   No `package.json` da raiz do monorepo, adicione um script que permita iniciar o servidor MCP com um comando simples.

4.  **Verificar o Funcionamento do Servidor MCP**:
    *   Inicie o servidor MCP através do script que você acabou de criar.
    *   Confirme que o servidor está ativo e que você consegue acessar as informações do projeto através da URL padrão do MCP (geralmente `http://localhost:3333/v1/context/project`).

## Próxima Tarefa:

Após a conclusão desta tarefa, você estará pronto para a `Tarefa 3: Inicializar a Aplicação Backend (apps/api)`.