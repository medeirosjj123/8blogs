# Tarefa 13: Implementar o Módulo de Suporte & Notificações

*   **Arquivo**: `tasks/task13_implement_support_notifications.md`
*   **Objetivo**: Desenvolver as funcionalidades básicas de suporte ao usuário e o sistema de notificações por e-mail para eventos críticos.
*   **Referência no `tatame.md`**: Seções "3.6) Suporte & Documentação" e "3.7) Notificações".

---

## Instruções de Ação:

Este módulo será implementado em etapas, focando no essencial para o MVP.

---

#### **13.1. Subtarefa: Desenvolver o Help Center (MVP)**

1.  **Objetivo**: Criar uma seção de FAQ simples para que os usuários possam encontrar respostas para dúvidas comuns.
2.  **Ação**:
    *   No frontend (`apps/web`), crie uma página estática ou um componente simples para exibir perguntas e respostas frequentes.
    *   Popule-o com informações básicas sobre a instalação de sites, DNS e uso da plataforma.
    *   **Verificação**: Acesse a página no frontend e confirme que o conteúdo é exibido corretamente.

---

#### **13.2. Subtarefa: Configurar Canal de Suporte Direto (MVP)**

1.  **Objetivo**: Fornecer um meio direto para os usuários entrarem em contato com o suporte.
2.  **Ação**:
    *   No frontend, adicione um link "Precisa de Ajuda?" que direcione para um endereço de e-mail de suporte (`mailto:suporte@afiliadofaixapreta.com.br`).
    *   **Verificação**: Clique no link e confirme que o cliente de e-mail padrão é aberto com o endereço de suporte preenchido.

---

#### **13.3. Subtarefa: Implementar Notificações por E-mail para Eventos Críticos**

1.  **Objetivo**: Enviar e-mails transacionais para os usuários em momentos chave do ciclo de vida da plataforma.
2.  **Ação**:
    *   No backend, configure um serviço de envio de e-mails (ex: usando um pacote como `nodemailer` com um provedor como Resend ou Mailgun, ou integrando com o n8n via webhook).
    *   Implemente funções para enviar e-mails para os seguintes eventos:
        *   **Boas-vindas** (após registro).
        *   **Magic Link de Login** (com o link gerado).
        *   **Job de Instalação Concluído** (informando o sucesso e o IP).
        *   **Job de Instalação com Erro** (informando a falha e, se possível, uma mensagem de erro útil).
    *   Integre o envio desses e-mails nos respectivos fluxos (registro, solicitação de magic link, processamento de job de instalação).
    *   **Verificação**: Teste cada um dos fluxos para confirmar que os e-mails são enviados e recebidos corretamente.

---

#### **13.4. Subtarefa: Desenvolver a Status Page (MVP)**

1.  **Objetivo**: Criar uma página simples que exiba o status operacional dos serviços chave da plataforma.
2.  **Ação**:
    *   No frontend, crie uma página estática ou um componente para a Status Page.
    *   Inicialmente, esta página pode exibir o status de forma manual (ex: "API: Operacional", "Fila de Jobs: Operacional").
    *   **Verificação**: Acesse a página no frontend e confirme que o status é exibido.

## Próxima Tarefa:

Após a conclusão desta tarefa, o módulo de suporte e notificações estará funcional. A próxima etapa será a `Tarefa 14: Implementar o Módulo de Administração e Logs`.
