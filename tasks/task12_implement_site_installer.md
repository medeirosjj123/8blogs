# Tarefa 12: Implementar o Módulo de Ferramentas (Instalador de Site)

*   **Arquivo**: `tasks/task12_implement_site_installer.md`
*   **Objetivo**: Desenvolver a ferramenta de instalação de sites WordPress no VPS do aluno, utilizando o fluxo de script único e integrando com o monitor de propagação de DNS.
*   **Referência no `tatame.md`**: Seção "3.5) Ferramentas (Execução)".

---

## Instruções de Ação:

Este módulo será implementado em etapas, focando na automação e na comunicação de status.

---

#### **12.1. Subtarefa: Definir Modelos de Site e Job de Instalação**

1.  **Objetivo**: Criar os schemas e modelos Mongoose para representar os sites dos alunos e os jobs de instalação associados.
2.  **Ação**: Crie os arquivos de modelo (`src/models/Site.ts`, `src/models/Job.ts`) no backend, definindo os schemas com campos como `userId`, `domain`, `templateId`, `status`, `ipAddress` para `Site`, e `siteId`, `state`, `logs` para `Job`.

---

#### **12.2. Subtarefa: Configurar Fila de Jobs (BullMQ)**

1.  **Objetivo**: Configurar uma fila de jobs assíncronos para processar as solicitações de instalação de sites, garantindo escalabilidade e resiliência.
2.  **Ação**:
    *   Instale as bibliotecas `bullmq` e `ioredis` (cliente Redis) no backend.
    *   Configure uma conexão com o Redis (local ou remoto) para o BullMQ.
    *   Crie uma fila de jobs (`siteInstallationQueue`) e um worker para processar os jobs.

---

#### **12.3. Subtarefa: Implementar Geração de Comando Único e API de Criação de Job**

1.  **Objetivo**: Criar a rota da API que recebe a solicitação do aluno para instalar um site e gera o comando único para execução no VPS.
2.  **Ação**:
    *   Crie um controlador de instalação de site (`src/controllers/siteInstallerController.ts`).
    *   Defina a rota `POST /api/sites` que:
        *   Valide os inputs do aluno (IP, domínio, template).
        *   Crie um novo registro de `Site` e `Job` no banco de dados.
        *   Adicione um job à fila (`siteInstallationQueue`).
        *   Gere e retorne o comando único (`curl -sL ... | sudo bash`) para o frontend.
    *   **Verificação**: Teste a rota `POST /api/sites` e confirme que um job é adicionado à fila e o comando único é retornado.

---

#### **12.4. Subtarefa: Desenvolver o Script de Provisionamento (Worker)**

1.  **Objetivo**: Implementar a lógica que será executada no VPS do aluno para instalar o WordPress e restaurar o template.
2.  **Ação**:
    *   No worker do BullMQ, implemente a função que será executada para cada job de instalação.
    *   Esta função deve:
        *   Receber os detalhes do job (IP, domínio, template URL).
        *   Executar comandos shell (via `child_process` ou similar) para:
            *   Realizar o "pre-flight check" do ambiente do VPS.
            *   Instalar o WordOps.
            *   Baixar o template do Backblaze B2 (usando URL pré-assinada).
            *   Verificar o checksum do template.
            *   Restaurar o site WordPress.
            *   Instalar o certificado SSL (Let's Encrypt).
        *   **Reportar o progresso e logs** para a API do Tatame em tempo real (via um endpoint específico, ex: `POST /api/jobs/:jobId/log`).
        *   Atualizar o status do `Job` no banco de dados (sucesso/falha).
    *   **Verificação**: Execute um job de instalação e monitore os logs para confirmar que o script está executando os passos corretamente e reportando o status.

---

#### **12.5. Subtarefa: Implementar Monitor de Propagação de DNS**

1.  **Objetivo**: Monitorar a propagação do DNS do site do aluno após a instalação.
2.  **Ação**:
    *   Crie um modelo `DnsCheck` (`src/models/DnsCheck.ts`) para registrar o status da propagação.
    *   Crie um job recorrente (cron job via BullMQ ou similar) que:
        *   Verifique o apontamento do record `A` do domínio para o IP do aluno.
        *   Verifique o status do HTTPS.
        *   Atualize o status no modelo `DnsCheck`.
    *   Adicione uma rota na API para o frontend consultar o status da propagação (`GET /api/sites/:siteId/dns-status`).
    *   **Verificação**: Após a instalação de um site, altere manualmente o DNS e verifique se o monitor detecta a propagação.

## Próxima Tarefa:

Após a conclusão desta tarefa, o módulo de ferramentas de instalação de site estará funcional. A próxima etapa será a `Tarefa 13: Implementar o Módulo de Suporte & Notificações`.
