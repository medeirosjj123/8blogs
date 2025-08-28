# Tarefa 14: Implementar o Módulo de Administração e Logs

*   **STATUS**: **NÃO CONCLUÍDA** (Apenas a configuração básica de logs do Pino está pronta.)
*   **Objetivo**: Desenvolver as funcionalidades essenciais para a administração da plataforma e garantir o registro adequado de logs e auditoria.
*   **Referência no `tatame.md`**: Seções "3.9) Administração" e "3.10) Logs & Auditoria".

---

## Instruções de Ação:

Este módulo será implementado em etapas, focando no controle e na visibilidade operacional.

---

#### **14.1. Subtarefa: Configurar Logs Estruturados e Sentry**

1.  **Objetivo**: Garantir que a aplicação backend gere logs estruturados e que erros não tratados sejam capturados automaticamente.
2.  **Ação**:
    *   No backend, configure o logger (Pino) para gerar logs em formato JSON (se ainda não estiver).
    *   Integre o Sentry ao backend e ao frontend para capturar automaticamente erros e exceções.
    *   **Verificação**: Force um erro em uma rota de teste e confirme que ele aparece no Sentry.

---

#### **14.2. Subtarefa: Implementar Audit Log (MVP)**

1.  **Objetivo**: Registrar as ações mais críticas e sensíveis realizadas na plataforma para fins de auditoria.
2.  **Ação**:
    *   Crie um modelo `AuditLog` (`src/models/AuditLog.ts`) no backend para armazenar os registros de auditoria.
    *   Implemente a lógica para registrar eventos como:
        *   Login e falhas de login.
        *   Concessão/revogação manual de acesso.
        *   Início de jobs de instalação de site.
    *   **Verificação**: Realize as ações que devem ser auditadas e verifique se os registros aparecem no banco de dados.

---

#### **14.3. Subtarefa: Desenvolver Painel de Administração (MVP)**

1.  **Objetivo**: Criar uma interface básica para a equipe administrativa gerenciar usuários, assinaturas e monitorar jobs.
2.  **Ação**:
    *   No frontend (`apps/web`), crie uma área de administração protegida por autenticação (apenas para usuários com `role: 'admin'`).
    *   Implemente as seguintes funcionalidades:
        *   **Buscar e visualizar usuários**: Uma lista simples de usuários com filtros básicos.
        *   **Conceder/revogar acesso manualmente**: Botões ou formulários para alterar o status de assinatura de um usuário.
        *   **Visualizar status e logs de jobs de instalação**: Uma lista dos jobs de instalação com seus status e logs detalhados.
        *   **Gerenciar catálogo de templates**: Uma interface para adicionar, remover ou atualizar templates de site.
        *   **Promover aluno de faixa**: Uma funcionalidade para alterar manualmente a faixa de um aluno.
    *   **Verificação**: Acesse o painel de administração com uma conta de admin e teste cada funcionalidade.

## Próxima Tarefa:

Após a conclusão desta tarefa, o módulo de administração e logs estará funcional. A próxima etapa será a `Tarefa 15: Implementar o Módulo de Segurança e Compliance`.