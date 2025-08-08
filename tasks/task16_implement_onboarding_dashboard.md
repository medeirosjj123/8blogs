# Tarefa 16: Implementar o Onboarding Inicial e o Dashboard do Usuário

*   **Arquivo**: `tasks/task16_implement_onboarding_dashboard.md`
*   **Objetivo**: Criar a experiência inicial do usuário após o login, guiando-o através de um checklist de onboarding e apresentando o dashboard principal.
*   **Referência no `tatame.md`**: Seção "2) Branding & UI/UX" -> "Estrutura IA (informação)" -> "Dashboard".

---

## Instruções de Ação:

Este módulo será implementado em etapas, focando na experiência do usuário.

---

#### **16.1. Subtarefa: Desenvolver a Página de Login/Registro (Frontend)**

1.  **Objetivo**: Criar a interface de usuário para registro e login, integrando-a com as rotas de autenticação do backend.
2.  **Ação**:
    *   No frontend (`apps/web`), crie as páginas ou componentes para registro e login.
    *   Implemente formulários para email/senha e um botão para "Login com Google" (se aplicável, será implementado em tarefa futura).
    *   Integre os formulários com as rotas `POST /api/auth/register` e `POST /api/auth/login` do backend.
    *   Gerencie o estado de autenticação no frontend (ex: usando `React Context` ou `TanStack Query`).
    *   **Verificação**: Teste o fluxo completo de registro e login no frontend, confirmando que o usuário é autenticado e redirecionado.

---

#### **16.2. Subtarefa: Implementar o Checklist de Onboarding ("Primeiro Treino")**

1.  **Objetivo**: Guiar o usuário através de um conjunto de ações iniciais para garantir uma boa primeira experiência na plataforma.
2.  **Ação**:
    *   No frontend, crie um componente de checklist que será exibido para novos usuários ou usuários que ainda não completaram o onboarding.
    *   Defina os itens do checklist (ex: "Complete seu perfil", "Apresente-se na comunidade", "Instale seu primeiro site").
    *   Implemente a lógica para marcar os itens como concluídos (pode ser persistido no modelo `User` ou em um novo modelo `OnboardingProgress`).
    *   **Verificação**: Crie um novo usuário e confirme que o checklist é exibido e que os itens podem ser marcados como concluídos.

---

#### **16.3. Subtarefa: Desenvolver o Dashboard Principal**

1.  **Objetivo**: Criar a página principal que o usuário verá após o login, exibindo informações relevantes e o checklist de onboarding.
2.  **Ação**:
    *   No frontend, crie a página do dashboard (`/dashboard`).
    *   Exiba o checklist de onboarding (se não estiver completo).
    *   Adicione seções para:
        *   Status dos “Treinos” da semana (pode ser um placeholder inicial).
        *   Progresso do curso (pode ser um resumo básico).
        *   Alertas e quick actions (placeholder).
    *   **Verificação**: Faça login e confirme que o dashboard é exibido com as informações básicas e o checklist.

## Próxima Tarefa:

Após a conclusão desta tarefa, a experiência inicial do usuário e o dashboard estarão implementados. A próxima etapa será a `Tarefa 17: Configurar o Ambiente de Produção e CI/CD`.
