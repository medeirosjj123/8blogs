# Tarefa 9: Implementar o Módulo de Assinaturas (Kiwify)

*   **Arquivo**: `tasks/task9_implement_kiwify_integration.md`
*   **Objetivo**: Integrar o backend com a Kiwify para gerenciar o acesso dos usuários com base em suas compras, utilizando webhooks e o fluxo de autologin.
*   **Referência no `tatame.md`**: Seção "3.2) Assinaturas / Acesso (Kiwify)".

---

## Instruções de Ação:

Este módulo será implementado em etapas, garantindo a segurança e a correta sincronização com a Kiwify.

---

#### **9.1. Subtarefa: Definir o Modelo de Membro (Membership)**

1.  **Objetivo**: Criar o schema e o modelo Mongoose para armazenar as informações de assinatura dos usuários, vinculando-as aos dados da Kiwify.
2.  **Ação**: Crie o arquivo do modelo de membro (`src/models/Membership.ts`) no backend, definindo o schema com campos como `userId`, `plan`, `status`, `kiwifyOrderId`, `kiwifyCustomerId`.

---

#### **9.2. Subtarefa: Configurar Webhook da Kiwify**

1.  **Objetivo**: Criar um endpoint no backend para receber e processar os webhooks da Kiwify, garantindo a autenticidade das requisições.
2.  **Ação**:
    *   Crie um controlador específico para webhooks (`src/controllers/webhookController.ts`).
    *   Adicione uma função para lidar com o webhook da Kiwify, incluindo a **verificação obrigatória da assinatura do webhook** para garantir a segurança.
    *   Defina a rota `POST /api/webhooks/kiwify` no backend.
    *   **Verificação**: Configure um webhook de teste na Kiwify (ou use uma ferramenta como `ngrok` para expor seu localhost) e envie um evento de teste para o seu endpoint. Confirme que a requisição é recebida e a assinatura é validada.

---

#### **9.3. Subtarefa: Implementar Lógica de Grant/Revoke de Acesso**

1.  **Objetivo**: Desenvolver a lógica para conceder ou revogar o acesso do usuário com base nos eventos de webhook da Kiwify (`pedido_aprovado/pago`, `pedido_cancelado/reembolso/chargeback`).
2.  **Ação**:
    *   No controlador de webhook, implemente a lógica para mapear o `produtoId` da Kiwify para um `plan` ou `role` interno do Tatame.
    *   Atualize o status da assinatura do usuário no modelo `Membership` e, se necessário, o `role` do usuário no modelo `User`.
    *   **Verificação**: Simule eventos de `pedido_aprovado` e `pedido_cancelado` da Kiwify e verifique se o status do usuário no banco de dados é atualizado corretamente.

---

#### **9.4. Subtarefa: Implementar Fluxo de Autologin (SSO Simples)**

1.  **Objetivo**: Criar um endpoint no backend que gere um token de autologin de curta duração, permitindo que o usuário seja redirecionado da Kiwify para o Tatame já autenticado.
2.  **Ação**:
    *   Crie uma nova função no controlador de autenticação (`src/controllers/authController.ts`) para gerar o token de autologin (um JWT curto e assinado).
    *   Defina a rota `GET /api/auth/autologin` que receba um token da Kiwify (se aplicável) e retorne o token de sessão do Tatame, ou redirecione o usuário.
    *   **Verificação**: Simule o redirecionamento da Kiwify para o seu endpoint de autologin e confirme que um token de sessão válido do Tatame é gerado.

## Próxima Tarefa:

Após a conclusão desta tarefa, o módulo de assinaturas estará funcional. A próxima etapa será a `Tarefa 10: Implementar o Módulo de Cursos & Conteúdo`.
