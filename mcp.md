# Ecossistema de Model Context Protocol (MCP) do Projeto Tatame

Este documento lista os servidores MCP, baseados na lista oficial, que planejamos usar no nosso ambiente de desenvolvimento para fornecer contexto estruturado e em tempo real para ferramentas de IA.

## 1. Servidores MCP Essenciais para o MVP

Estes são os servidores que trarão mais valor no início do projeto.

- **Servidor Principal do Projeto (`mcp/server`)**
  - **Repositório**: https://github.com/modelcontextprotocol/servers/tree/main/mcp
  - **Linguagem**: TypeScript
  - **Propósito**: Descreverá o contexto geral do projeto Tatame: stack, arquivos importantes, schemas de dados, e comandos principais. Será a fonte primária da verdade sobre a arquitetura do projeto, configurado através de um arquivo `mcp.config.js`.

- **Servidor TypeScript (`typescript/mcp`)**
  - **Repositório**: https://github.com/modelcontextprotocol/servers/tree/main/typescript
  - **Linguagem**: TypeScript
  - **Propósito**: Fornecerá contexto sobre a configuração do TypeScript (`tsconfig.json`), incluindo caminhos de alias, tipos definidos e outras configurações do compilador, garantindo que o código gerado seja compatível.

- **Servidor ESLint (`eslint/mcp`)**
  - **Repositório**: https://github.com/modelcontextprotocol/servers/tree/main/eslint
  - **Linguagem**: TypeScript
  - **Propósito**: Informará as regras de linting ativas, permitindo que a IA gere código que já esteja em conformidade com os padrões de estilo do projeto, evitando a necessidade de correções manuais.

- **Servidor Tailwind CSS (`tailwind/mcp`)**
  - **Repositório**: https://github.com/modelcontextprotocol/servers/tree/main/tailwind
  - **Linguagem**: TypeScript
  - **Propósito**: Exporá o contexto do `tailwind.config.js`, incluindo cores, fontes, espaçamentos e plugins customizados. Essencial para a construção de UIs consistentes com o design system.

- **Servidor de Comandos Shell (`shell/mcp`)**
  - **Repositório**: https://github.com/modelcontextprotocol/servers/tree/main/shell
  - **Linguagem**: Go
  - **Propósito**: Oferecerá um contexto sobre os scripts e comandos disponíveis no `package.json`, explicando o que cada um faz. Útil para que a IA possa executar os comandos corretos para build, dev, lint, etc.

## 2. Servidores MCP para Testes

Estes servidores serão configurados conforme as ferramentas de teste forem implementadas.

- **Servidor de Testes E2E (`playwright/mcp`)**
  - **Repositório**: https://github.com/modelcontextprotocol/servers/tree/main/playwright
  - **Linguagem**: TypeScript
  - **Propósito**: Fornecerá contexto sobre os testes de ponta a ponta. Permitirá à IA listar testes existentes, entender page objects, e seguir o padrão de escrita de testes do projeto.

- **Servidor de Testes Unitários (`vitest/mcp`)**
  - **Repositório**: https://github.com/modelcontextprotocol/servers/tree/main/vitest
  - **Linguagem**: TypeScript
  - **Propósito**: Para testes unitários e de integração. Fornecerá contexto sobre os testes existentes, permitindo a criação de novos testes unitários que sigam as convenções do projeto.

## 3. Servidores MCP para Consideração Futura

- **Servidor Git (`git/mcp`)**
  - **Repositório**: https://github.com/modelcontextprotocol/servers/tree/main/git
  - **Linguagem**: Go
  - **Propósito**: Pode fornecer contexto sobre o estado do repositório (branch atual, status dos arquivos), útil para automações de git mais complexas.

## Próximos Passos

O primeiro passo de implementação será configurar os **Servidores Essenciais para o MVP**, começando pelo servidor principal do projeto (`mcp/server`).
