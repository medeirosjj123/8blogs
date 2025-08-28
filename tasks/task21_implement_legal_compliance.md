# Tarefa 21: Implementar o Módulo de Legal/Políticas e Consentimento

*   **STATUS**: **NÃO CONCLUÍDA**
*   **Objetivo**: Garantir que a plataforma esteja em conformidade com as regulamentações de privacidade e dados, exibindo políticas e gerenciando o consentimento do usuário.
*   **Referência no `tatame.md`**: Seção "3.11) Segurança & Compliance" -> "Políticas".

---

## Instruções de Ação:

Este módulo será implementado em etapas, focando na transparência e conformidade.

---

#### **21.1. Subtarefa: Criar Páginas de Políticas (ToS, Privacidade, AUP)**

1.  **Objetivo**: Desenvolver páginas estáticas para os Termos de Serviço, Política de Privacidade e Política de Uso Aceitável.
2.  **Ação**:
    *   No frontend (`apps/web`), crie páginas ou componentes para cada uma das políticas (ex: `/terms`, `/privacy`, `/aup`).
    *   Preencha o conteúdo de cada página com os textos legais apropriados.
    *   **Verificação**: Acesse cada página no navegador e confirme que o conteúdo é exibido corretamente.

---

#### **21.2. Subtarefa: Implementar Banner de Consentimento de Cookies (MVP)**

1.  **Objetivo**: Obter o consentimento do usuário para o uso de cookies e tecnologias de rastreamento, conforme exigido pela LGPD.
2.  **Ação**:
    *   No frontend, implemente um banner de consentimento de cookies que apareça para novos usuários ou usuários que ainda não deram consentimento.
    *   O banner deve permitir que o usuário aceite ou recuse o uso de cookies.
    *   Persista a escolha do usuário (ex: em `localStorage`).
    *   **Verificação**: Acesse a aplicação como um novo usuário e confirme que o banner é exibido. Faça uma escolha e confirme que o banner não aparece novamente.

---

#### **21.3. Subtarefa: Fornecer Processo de Exportação/Remoção de Dados**

1.  **Objetivo**: Permitir que o usuário solicite a exportação ou remoção de seus dados pessoais da plataforma, em conformidade com a LGPD.
2.  **Ação**:
    *   No frontend, adicione uma opção na página de perfil ou conta para "Solicitar Exportação de Dados" e "Solicitar Remoção de Conta".
    *   No backend (`apps/api`), crie rotas para lidar com essas solicitações (ex: `POST /api/users/data-export`, `DELETE /api/users/me`).
    *   Implemente a lógica para processar essas solicitações (ex: gerar um arquivo com os dados do usuário para exportação, ou marcar o usuário para remoção).
    *   **Verificação**: Teste as opções no frontend e confirme que as solicitações são recebidas e processadas pelo backend.

## Próxima Tarefa:

Após a conclusão desta tarefa, o módulo de legal/políticas e consentimento estará implementado. Esta é a última tarefa do **Marco 1: Lançamento do Tatame (A Plataforma) - MVP**.