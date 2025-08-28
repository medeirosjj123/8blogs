# Tarefa 15: Implementar o Módulo de Segurança e Compliance

*   **STATUS**: **PARCIALMENTE CONCLUÍDA**
*   **Objetivo**: Implementar as medidas de segurança e compliance essenciais para proteger a plataforma e os dados dos usuários.
*   **Referência no `tatame.md`**: Seção "3.11) Segurança & Compliance".

---

## Instruções de Ação:

Este módulo será implementado em etapas, focando nas proteções mais críticas para o MVP.

---

#### **15.1. Subtarefa: Gerenciar Segredos e Variáveis de Ambiente**

1.  **Objetivo**: Garantir que as informações sensíveis (segredos) sejam gerenciadas de forma segura e que as variáveis de ambiente sejam validadas.
2.  **Ação**:
    *   Certifique-se de que todas as chaves API, segredos JWT e credenciais de banco de dados estejam armazenadas em variáveis de ambiente (`.env`) e **nunca** diretamente no código-fonte.
    *   **PENDENTE**: Implemente a validação das variáveis de ambiente no backend (ex: usando `Zod` ou similar) na inicialização da aplicação, garantindo que todas as variáveis necessárias estejam presentes e no formato correto.
    *   **Verificação**: Remova uma variável de ambiente essencial e tente iniciar o backend para confirmar que a validação falha com uma mensagem clara.

---

#### **15.2. Subtarefa: Implementar Estratégia de Rate Limiting**

1.  **Objetivo**: Proteger a API contra abuso e ataques de força bruta, limitando o número de requisições.
2.  **Ação**:
    *   **PENDENTE**: No backend, implemente um middleware de rate limiting (ex: `express-rate-limit`) para as rotas da API.
    *   **PENDENTE**: Configure limites gerais por IP para todas as rotas.
    *   **PENDENTE**: Configure limites específicos por usuário/ação para rotas sensíveis e caras (ex: login, registro, criação de sites, envio de mensagens na comunidade).
    *   **Verificação**: Teste as rotas com ferramentas como `ab` (ApacheBench) ou `curl` em loop para confirmar que os limites são aplicados e as respostas de erro (`429 Too Many Requests`) são retornadas.

---

#### **15.3. Subtarefa: Implementar Sanitização de Uploads**

1.  **Objetivo**: Garantir que os arquivos enviados pelos usuários (especialmente imagens) sejam seguros e não contenham metadados ou conteúdo malicioso.
2.  **Ação**:
    *   No backend, na rota de upload de imagens (já definida na Tarefa 11.4), adicione a lógica para processar as imagens usando uma biblioteca como `sharp`.
    *   Remova metadados EXIF, comprima a imagem e valide o tipo de arquivo para garantir que é uma imagem legítima.
    *   **Verificação**: Faça upload de imagens com metadados e confirme que eles são removidos. Tente fazer upload de arquivos não-imagem para confirmar que são rejeitados.

---

#### **15.4. Subtarefa: Configurar Proteções Básicas de API**

1.  **Objetivo**: Implementar proteções padrão contra vulnerabilidades comuns em APIs web.
2.  **Ação**:
    *   Configure o middleware CORS (Cross-Origin Resource Sharing) no Express.js para permitir requisições apenas de domínios autorizados (frontend e outros serviços).
    *   **PENDENTE**: Implemente a proteção CSRF (Cross-Site Request Forgery) para rotas que modificam o estado do servidor (ex: `POST`, `PUT`, `DELETE`).
    *   Garanta que as respostas de login e "esqueci a senha" sejam genéricas para evitar a enumeração de usuários.
    *   **Verificação**: Teste as rotas com requisições de origens não permitidas, sem tokens CSRF, e com e-mails inexistentes para confirmar as proteções.

## Próxima Tarefa:

Após a conclusão desta tarefa, o módulo de segurança e compliance estará funcional. A próxima etapa será a `Tarefa 16: Implementar o Onboarding Inicial e o Dashboard do Usuário`.