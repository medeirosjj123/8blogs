# Tarefa 20: Implementar o Módulo de Perfil e Conta do Usuário

*   **STATUS**: **PARCIALMENTE CONCLUÍDA**
*   **Objetivo**: Desenvolver a funcionalidade que permite ao usuário visualizar e gerenciar suas informações pessoais, configurações de segurança e detalhes da conta.
*   **Referência no `tatame.md`**: Seção "2) Branding & UI/UX" -> "Estrutura IA (informação)" -> "Perfil/Conta".

---

## Instruções de Ação:

Este módulo será implementado em etapas, focando na gestão de informações do usuário.

---

#### **20.1. Subtarefa: Criar a Página de Perfil do Usuário**

1.  **Objetivo**: Desenvolver a interface onde o usuário pode visualizar suas informações básicas.
2.  **Ação**:
    *   No frontend (`apps/web`), crie a página de perfil (`/profile`).
    *   Exiba informações como nome, e-mail, papel (aluno, mentor, etc.) e data de registro.
    *   **Verificação**: Acesse a página de perfil e confirme que as informações do usuário logado são exibidas corretamente.

---

#### **20.2. Subtarefa: Implementar Edição de Informações Pessoais**

1.  **Objetivo**: Permitir que o usuário edite suas informações básicas (ex: nome).
2.  **Ação**:
    *   No frontend, adicione um formulário na página de perfil para edição de campos como o nome.
    *   **PENDENTE**: No backend (`apps/api`), crie uma rota `PUT /api/users/me` para atualizar as informações do usuário.
    *   Integre o formulário do frontend com essa rota da API.
    *   **Verificação**: Edite o nome do usuário no frontend e confirme que a alteração é persistida no banco de dados.

---

#### **20.3. Subtarefa: Configurar Opções de Segurança (MVP)**

1.  **Objetivo**: Fornecer opções básicas de segurança para o usuário.
2.  **Ação**:
    *   No frontend, adicione uma seção de segurança na página de perfil.
    *   Inclua um botão para "Desconectar todas as sessões" (a funcionalidade de backend para isso será implementada em uma tarefa futura).
    *   **Verificação**: Confirme que a seção de segurança é exibida.

---

#### **20.4. Subtarefa: Exibir Detalhes da Assinatura (MVP)**

1.  **Objetivo**: Mostrar ao usuário informações sobre sua assinatura e plano.
2.  **Ação**:
    *   No frontend, adicione uma seção de "Minha Assinatura" na página de perfil.
    *   Exiba o plano atual do usuário e o status da assinatura (ex: "Ativo", "Pendente", "Cancelado").
    *   **Verificação**: Confirme que os detalhes da assinatura são exibidos.

## Próxima Tarefa:

Após a conclusão desta tarefa, o módulo de perfil e conta do usuário estará implementado. A próxima etapa será a `Tarefa 21: Implementar o Módulo de Legal/Políticas e Consentimento`.