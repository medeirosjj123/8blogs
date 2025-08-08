# Tarefa 17: Configurar o Ambiente de Produção e CI/CD

*   **Arquivo**: `tasks/task17_setup_production_ci_cd.md`
*   **Objetivo**: Preparar o projeto para ser implantado em um ambiente de produção e automatizar o processo de build e deploy usando GitHub Actions.
*   **Referência no `tatame.md`**: Seções "4.1) Stack Principal" -> "Infra (sem Docker)" e "CI/CD", e "11) Guia rápido de Deploy (sem Docker)".

---

## Instruções de Ação:

Este módulo será implementado em etapas, focando na automação e na segurança do deploy.

---

#### **17.1. Subtarefa: Configurar o Servidor VPS (Ubuntu)**

1.  **Objetivo**: Preparar um servidor virtual privado (VPS) com Ubuntu para hospedar a aplicação Tatame.
2.  **Ação**:
    *   Provisione um novo VPS com Ubuntu 22.04 (ou versão LTS mais recente).
    *   Realize as atualizações iniciais do sistema (`apt update && apt upgrade`).
    *   Instale as dependências necessárias: Node.js LTS, Nginx, Redis, PM2, Certbot, UFW.
    *   Configure o UFW (Uncomplicated Firewall) para permitir tráfego nas portas 80 (HTTP), 443 (HTTPS) e 22 (SSH).
    *   **Verificação**: Confirme que todos os serviços estão instalados e que as portas estão abertas conforme o esperado.

---

#### **17.2. Subtarefa: Configurar Nginx como Reverse Proxy**

1.  **Objetivo**: Configurar o Nginx para atuar como um reverse proxy, direcionando o tráfego da web para a aplicação Node.js do backend.
2.  **Ação**:
    *   Crie um arquivo de configuração Nginx para o seu domínio (ex: `tatame.afiliadofaixapreta.com.br`).
    *   Configure o Nginx para encaminhar as requisições HTTP/HTTPS para a porta interna onde o backend Express.js estará rodando (ex: porta 3000).
    *   Configure o Certbot para obter e renovar certificados SSL Let's Encrypt para o seu domínio, garantindo HTTPS.
    *   **Verificação**: Acesse seu domínio no navegador e confirme que a aplicação backend responde via Nginx e que o HTTPS está ativo.

---

#### **17.3. Subtarefa: Configurar PM2 para Gerenciamento de Processos**

1.  **Objetivo**: Utilizar o PM2 para gerenciar o processo da aplicação Node.js em produção, garantindo que ela permaneça online e reinicie automaticamente em caso de falha.
2.  **Ação**:
    *   Crie um arquivo de configuração PM2 (`ecosystem.config.js`) na raiz do seu monorepo.
    *   Configure o PM2 para iniciar a aplicação backend (`apps/api`), monitorar seu estado, reiniciar em caso de crash e gerenciar logs.
    *   **Verificação**: Inicie a aplicação com PM2 e confirme que ela está rodando e que os logs são gerados.

---

#### **17.4. Subtarefa: Configurar CI/CD com GitHub Actions**

1.  **Objetivo**: Automatizar o processo de build, lint, teste e deploy do projeto usando GitHub Actions.
2.  **Ação**:
    *   Crie um repositório no GitHub para o seu projeto.
    *   Configure as GitHub Secrets para armazenar credenciais sensíveis (ex: chave SSH para deploy, variáveis de ambiente de produção).
    *   Crie um workflow de GitHub Actions (`.github/workflows/deploy.yml`) que:
        *   Dispare em push para a branch principal (ex: `main`).
        *   Instale as dependências do monorepo.
        *   Execute os comandos de lint e build.
        *   Execute os testes (se já implementados).
        *   Realize o deploy via SSH para o seu VPS, copiando os arquivos compilados e reiniciando a aplicação com PM2.
    *   **Verificação**: Faça um pequeno commit e push para a branch principal e monitore a execução do workflow no GitHub Actions. Confirme que o deploy é realizado com sucesso no seu VPS.

## Próxima Tarefa:

Após a conclusão desta tarefa, o projeto estará configurado para produção e com um pipeline de CI/CD funcional. A próxima etapa será a `Tarefa 18: Implementar o Dashboard do Usuário e o Onboarding Inicial (Frontend)`.
