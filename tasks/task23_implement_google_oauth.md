# Tarefa 23: Implementar o Módulo de Google OAuth

*   **STATUS**: **PARCIALMENTE CONCLUÍDA**
*   **Objetivo**: Adicionar a funcionalidade de autenticação de usuários via Google OAuth, permitindo login e registro através da conta Google.
*   **Referência no `tatame.md`**: Seção "14) Google OAuth — Passo a passo (React + Vite + Express)".

---

## Instruções de Ação:

Este módulo será implementado em etapas, focando na integração segura com a API do Google.

---

#### **23.1. Subtarefa: Configurar Projeto no Google Cloud Console**

1.  **Objetivo**: Criar e configurar as credenciais OAuth 2.0 no Google Cloud Console para a aplicação Tatame.
2.  **Ação**:
    *   Acesse o Google Cloud Console e crie um novo projeto.
    *   Configure a tela de consentimento OAuth.
    *   Crie um ID de cliente OAuth do tipo "Aplicativo da Web".
    *   Configure os "URIs de redirecionamento autorizados" e as "Origens JavaScript autorizadas" para os ambientes de desenvolvimento e produção.
    *   Obtenha o `GOOGLE_CLIENT_ID` e o `GOOGLE_CLIENT_SECRET`.
    *   **Verificação**: Confirme que as credenciais foram geradas e que os URIs estão corretamente configurados.

---

#### **23.2. Subtarefa: Implementar Rotas de Autenticação Google no Backend**

1.  **Objetivo**: Desenvolver os endpoints no backend para iniciar o fluxo OAuth do Google e lidar com o callback de autenticação.
2.  **Ação**:
    *   Instale as dependências necessárias para OAuth 2.0 (ex: `passport`, `passport-google-oauth20` ou `google-auth-library`).
    *   Crie um endpoint `GET /api/auth/google` que redirecione o usuário para a página de consentimento do Google.
    *   Crie um endpoint `GET /api/auth/google/callback` que receba o código de autorização do Google, troque-o por tokens, valide o `id_token`, e crie/associe o usuário no banco de dados.
    *   Após a autenticação bem-sucedida, gere e retorne um JWT de sessão do Tatame.
    *   **Verificação**: Teste o fluxo de redirecionamento e callback, confirmando que o usuário é autenticado e um token de sessão é gerado.

---

#### **23.3. Subtarefa: Integrar Botão "Continuar com Google" no Frontend**

1.  **Objetivo**: Adicionar a opção de login/registro com Google na interface do usuário.
2.  **Ação**:
    *   No frontend (`apps/web`), na página de login/registro, adicione um botão "Continuar com Google".
    *   Configure este botão para redirecionar o usuário para o endpoint `GET /api/auth/google` do backend.
    *   **Verificação**: Clique no botão e confirme que o fluxo de autenticação Google é iniciado e que, após a conclusão, o usuário é logado na aplicação Tatame.

---

#### **23.4. Subtarefa: Lógica de Integração com RBAC e Kiwify**

1.  **Objetivo**: Garantir que usuários autenticados via Google OAuth tenham seus papéis e permissões corretamente atribuídos com base na integração com a Kiwify.
2.  **Ação**:
    *   No endpoint de callback do Google OAuth no backend, após a criação/associação do usuário, implemente a lógica para verificar o status da assinatura via Kiwify (se o e-mail já estiver associado a uma compra).
    *   Atribua o papel (`role`) apropriado ao usuário com base no status da assinatura.
    *   **Verificação**: Autentique-se com uma conta Google que tenha uma compra associada na Kiwify e confirme que o papel correto é atribuído.

## Próxima Tarefa:

Após a conclusão desta tarefa, o módulo de Google OAuth estará funcional. A próxima etapa será a `Tarefa 24: Implementar o Módulo de Testes E2E (Playwright)`.