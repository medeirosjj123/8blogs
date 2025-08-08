# Tarefa 11: Implementar o Módulo de Comunidade (Slack-like)

*   **Arquivo**: `tasks/task11_implement_community_module.md`
*   **Objetivo**: Desenvolver a funcionalidade de comunicação em tempo real (chat) para a comunidade Tatame, incluindo canais e mensagens.
*   **Referência no `tatame.md`**: Seção "3.4) Comunidade (Slack-like)".

---

## Instruções de Ação:

Este módulo será implementado em etapas, focando na funcionalidade básica de chat.

---

#### **11.1. Subtarefa: Configurar Socket.IO e Redis Adapter**

1.  **Objetivo**: Configurar o backend para comunicação em tempo real usando Socket.IO e o Redis Adapter para escalabilidade.
2.  **Ação**:
    *   Instale as bibliotecas `socket.io`, `socket.io-redis` e `redis` no backend.
    *   Configure o servidor Socket.IO no `index.ts` do backend, integrando-o com o servidor Express.js.
    *   Configure o Redis Adapter para o Socket.IO, garantindo que as mensagens possam ser distribuídas entre múltiplas instâncias do backend (se aplicável no futuro).

---

#### **11.2. Subtarefa: Definir Modelos de Canal e Mensagem**

1.  **Objetivo**: Criar os schemas e modelos Mongoose para representar os canais de chat e as mensagens.
2.  **Ação**: Crie os arquivos de modelo (`src/models/Channel.ts`, `src/models/Message.ts`) no backend, definindo os schemas com campos como `name`, `description` para canais, e `channelId`, `userId`, `content`, `timestamp` para mensagens.

---

#### **11.3. Subtarefa: Implementar Lógica de Canais e Mensagens**

1.  **Objetivo**: Desenvolver a lógica para criar canais, enviar e receber mensagens em tempo real.
2.  **Ação**:
    *   No backend, crie um controlador de chat (`src/controllers/chatController.ts`) para lidar com a lógica de persistência de mensagens.
    *   Configure os eventos do Socket.IO (`connection`, `disconnect`, `joinRoom`, `sendMessage`) para:
        *   Autenticar usuários na conexão.
        *   Permitir que usuários entrem em canais.
        *   Persistir mensagens no banco de dados.
        *   Emitir mensagens para todos os clientes conectados a um canal.
    *   No frontend, crie um componente de chat que se conecte ao servidor Socket.IO, permita ao usuário selecionar um canal, enviar mensagens e exibir as mensagens recebidas em tempo real.
    *   **Verificação**: Teste a funcionalidade de chat enviando mensagens de múltiplos clientes e confirmando que elas são exibidas em tempo real e persistidas no banco de dados.

---

#### **11.4. Subtarefa: Implementar Uploads de Imagem (MVP)**

1.  **Objetivo**: Permitir que usuários façam upload de imagens nas mensagens do chat, com compressão e sanitização.
2.  **Ação**:
    *   No backend, configure uma rota para upload de arquivos (`POST /api/upload/image`).
    *   Implemente a lógica para receber o arquivo, processá-lo (compressão, remoção de metadados, validação de tipo) usando uma biblioteca como `sharp`, e armazená-lo (temporariamente ou em um serviço de armazenamento).
    *   No frontend, adicione a funcionalidade de upload de imagem ao compositor de mensagens do chat.
    *   **Verificação**: Faça upload de uma imagem e confirme que ela é processada e exibida corretamente no chat.

---

#### **11.5. Subtarefa: Implementar Busca de Mensagens (MVP)**

1.  **Objetivo**: Permitir que usuários busquem mensagens dentro de um canal.
2.  **Ação**:
    *   No backend, adicione uma rota na API para buscar mensagens em um canal específico (`GET /api/channels/:channelId/messages/search?query=...`).
    *   Utilize as capacidades de busca de texto do MongoDB (`$text` index) para realizar a pesquisa.
    *   No frontend, adicione um campo de busca na interface do chat para permitir que o usuário pesquise mensagens.
    *   **Verificação**: Envie algumas mensagens com palavras-chave específicas e teste a funcionalidade de busca.

## Próxima Tarefa:

Após a conclusão desta tarefa, o módulo de comunidade estará funcional. A próxima etapa será a `Tarefa 12: Implementar o Módulo de Ferramentas (Instalador de Site)`.
