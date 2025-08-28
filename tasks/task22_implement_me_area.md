# Tarefa 22: Implementar e Consolidar a Área "Meu Perfil" (Me Area)

*   **STATUS**: **NÃO CONCLUÍDA**
*   **Objetivo**: Consolidar e aprimorar todas as funcionalidades relacionadas ao perfil do usuário, configurações de conta, segurança e preferências em uma área centralizada e robusta, integrando módulos já existentes e adicionando novas capacidades.
*   **Referência no `tatame.md`**: Seção "2) Branding & UI/UX" -> "Estrutura IA (informação)" -> "Perfil/Conta".
*   **Dependências**: Esta tarefa depende da conclusão de todas as tarefas anteriores, especialmente:
    *   `Tarefa 8: Implementar o Módulo de Autenticação` (para JWT, usuários, etc.)
    *   `Tarefa 9: Implementar o Módulo de Assinaturas (Kiwify)` (para dados de assinatura)
    *   `Tarefa 13: Implementar o Módulo de Suporte & Notificações` (para preferências de notificação)
    *   `Tarefa 20: Implementar o Módulo de Perfil e Conta do Usuário` (como base para esta refatoração).

---

## Instruções de Ação:

Esta tarefa é uma refatoração e expansão da `Tarefa 20`, elevando-a ao nível de uma "Me Area" completa.

---

#### **22.1. Subtarefa: Refatorar e Consolidar a Página de Perfil Existente (Frontend)**

1.  **Objetivo**: Transformar a página de perfil básica (`/profile`) em um hub central para todas as configurações e informações do usuário.
2.  **Ação**:
    *   No frontend (`apps/web`), revise e aprimore a página de perfil (`/profile`) criada na `Tarefa 20`.
    *   Organize a interface em seções claras: "Dados Pessoais", "Segurança", "Notificações", "Assinatura".
    *   Garanta que a navegação para esta área seja proeminente (ex: através do ícone "Perfil" na `BottomNav` da `Tarefa 19`).
    *   **Verificação**: Acesse a página `/profile` e confirme a nova organização visual.

---

#### **22.2. Subtarefa: Implementar Gerenciamento de Dados Pessoais (Frontend & Backend)**

1.  **Objetivo**: Permitir que o usuário visualize e atualize suas informações pessoais (nome, e-mail).
2.  **Ação**:
    *   No frontend, garanta que o formulário de edição de nome esteja funcional e que o e-mail seja exibido (mas não editável diretamente, pois é a chave de login).
    *   **PENDENTE**: No backend (`apps/api`), crie uma rota `PUT /api/users/me` para atualizar as informações do usuário.
    *   **Verificação**: Atualize o nome do usuário no frontend e confirme a persistência no banco de dados.

---

#### **22.3. Subtarefa: Implementar Configurações de Segurança (2FA e Gerenciamento de Sessões)**

1.  **Objetivo**: Adicionar funcionalidades de segurança avançadas, como Autenticação de Dois Fatores (2FA) e a capacidade de desconectar sessões ativas.
2.  **Ação**:
    *   **PENDENTE - 2FA (Backend)**:
        *   Instale as dependências necessárias para 2FA (ex: `speakeasy` para TOTP).
        *   Crie endpoints no backend para:
            *   `POST /api/auth/2fa/setup`: Iniciar a configuração do 2FA (gerar QR Code/secret).
            *   `POST /api/auth/2fa/verify`: Verificar o código TOTP durante o setup.
            *   `POST /api/auth/2fa/enable`: Ativar o 2FA para o usuário.
            *   `POST /api/auth/2fa/disable`: Desativar o 2FA.
        *   Modifique o processo de login para exigir o código 2FA se estiver ativado para o usuário.
    *   **PENDENTE - 2FA (Frontend)**:
        *   Na seção "Segurança" da "Me Area", adicione a interface para o usuário configurar o 2FA (exibir QR Code, campo para código de verificação).
    *   **PENDENTE - Gerenciamento de Sessões (Backend)**:
        *   Implemente a lógica para invalidar tokens de sessão (JWTs) no backend (ex: usando uma blacklist de tokens ou invalidando o refresh token).
        *   Crie um endpoint `POST /api/auth/logout-all-sessions` para desconectar todas as sessões de um usuário.
    *   **PENDENTE - Gerenciamento de Sessões (Frontend)**:
        *   Na seção "Segurança" da "Me Area", adicione um botão "Desconectar todas as sessões" que chame o endpoint do backend.
    *   **Verificação**: Teste o fluxo completo de ativação/desativação do 2FA. Teste o botão de desconectar sessões e confirme que outras sessões são invalidadas.

---

#### **22.4. Subtarefa: Integrar Preferências de Notificações**

1.  **Objetivo**: Permitir que o usuário gerencie quais tipos de notificações ele deseja receber.
2.  **Ação**:
    *   **PENDENTE**: No backend, adicione campos ao modelo `User` (ou crie um novo modelo `NotificationPreferences`) para armazenar as preferências de notificação (ex: `receiveEmailNotifications: boolean`, `receiveCommunityMentions: boolean`).
    *   **PENDENTE**: Crie um endpoint `PUT /api/users/notification-preferences` para atualizar essas preferências.
    *   **PENDENTE**: No frontend, adicione uma seção "Notificações" na "Me Area" com toggles ou checkboxes para as diferentes opções de notificação.
    *   **Verificação**: Altere as preferências no frontend e confirme que são persistidas e respeitadas pelo sistema de notificações.

---

#### **22.5. Subtarefa: Exibir Visão Geral de Assinatura e Faturamento**

1.  **Objetivo**: Fornecer ao usuário uma visão clara de seu status de assinatura e acesso a informações de faturamento.
2.  **Ação**:
    *   No frontend, na seção "Assinatura" da "Me Area", exiba o plano atual do usuário e o status da assinatura (obtidos via `Membership` model da `Tarefa 9`).
    *   Adicione um link para o portal de faturamento da Kiwify (se houver um URL direto para o cliente).
    *   **Verificação**: Confirme que as informações da assinatura são exibidas corretamente.

## Próxima Tarefa:

Após a conclusão desta tarefa, a "Área Meu Perfil" estará completa e robusta. A próxima etapa será a `Tarefa 23: Implementar o Módulo de Google OAuth`.