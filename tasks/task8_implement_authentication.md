# Tarefa 8: Implementar o Módulo de Autenticação (Email+Senha e Magic Link)

*   **Arquivo**: `tasks/task8_implement_authentication.md`
*   **Objetivo**: Desenvolver a funcionalidade de autenticação de usuários, permitindo registro, login com email/senha e login via magic link, conforme as diretrizes de segurança e UX do projeto.
*   **Referência no `tatame.md`**: Seção "3.1) Autenticação & Acesso".

---

## Instruções de Ação:

Este módulo será implementado em etapas, garantindo que cada parte funcione corretamente antes de avançar.

---

#### **8.1. Subtarefa: Definir o Modelo de Usuário (Mongoose)**

1.  **Objetivo**: Criar o schema e o modelo Mongoose para representar os usuários no banco de dados, incluindo campos para credenciais e dados de perfil, e integrando-o com os tipos compartilhados.
2.  **Ação**: Crie o arquivo do modelo de usuário (`src/models/User.ts`) no backend, definindo o schema com campos como `email`, `passwordHash`, `name`, `role`, e campos para o magic link.

---

#### **8.2. Subtarefa: Configurar Hash de Senha e Geração de Token Seguro**

1.  **Objetivo**: Implementar funções utilitárias para fazer hash de senhas de forma segura (usando `bcrypt`) e para gerar tokens aleatórios seguros (para magic links).
2.  **Ação**: Crie um arquivo de utilitários de autenticação (`src/utils/auth.ts`) no backend, contendo as funções para `hashPassword`, `comparePassword` e `generateSecureToken`.

---

#### **8.3. Subtarefa: Implementar Rotas de Registro (Signup)**

1.  **Objetivo**: Criar a rota da API que permite a novos usuários se cadastrarem na plataforma.
2.  **Ação**:
    *   Crie um controlador de autenticação (`src/controllers/authController.ts`) e adicione a função `register`.
    *   Crie um arquivo de rotas de autenticação (`src/routes/authRoutes.ts`) e defina a rota `POST /api/auth/register`.
    *   Integre essas rotas ao arquivo principal da aplicação backend (`src/index.ts`).
    *   **Verificação**: Teste a rota de registro para garantir que novos usuários podem ser criados e que a proteção contra enumeração de e-mails funciona.

---

#### **8.4. Subtarefa: Implementar Rotas de Login (Email+Senha)**

1.  **Objetivo**: Criar a rota da API que permite a usuários registrados fazerem login com suas credenciais de email e senha.
2.  **Ação**:
    *   No controlador de autenticação (`src/controllers/authController.ts`), adicione a função `login`.
    *   No arquivo de rotas de autenticação (`src/routes/authRoutes.ts`), defina a rota `POST /api/auth/login`.
    *   **Verificação**: Teste a rota de login com credenciais válidas e inválidas para confirmar o comportamento esperado.

---

#### **8.5. Subtarefa: Gerar e Validar Tokens de Sessão (JWT)**

1.  **Objetivo**: Implementar a geração de JSON Web Tokens (JWTs) para gerenciar sessões de usuário e criar um middleware para proteger rotas da API.
2.  **Ação**:
    *   Adicione a biblioteca `jsonwebtoken` ao backend.
    *   Configure uma chave secreta para o JWT nas variáveis de ambiente.
    *   Modifique a função `login` no controlador para gerar e retornar um JWT após o login bem-sucedido.
    *   Crie um middleware de autenticação (`src/middlewares/authMiddleware.ts`) que valide o JWT presente nas requisições.
    *   Adicione uma rota de teste protegida para verificar se o middleware funciona corretamente.
    *   **Verificação**: Obtenha um token de login e use-o para acessar a rota protegida. Tente acessar sem token ou com um token inválido.

---

#### **8.6. Subtarefa: Implementar Rotas de Magic Link**

1.  **Objetivo**: Criar as rotas da API para solicitar e validar magic links, permitindo que usuários façam login sem precisar de senha.
2.  **Ação**:
    *   No controlador de autenticação (`src/controllers/authController.ts`), adicione as funções `requestMagicLink` e `loginWithMagicLink`.
    *   No arquivo de rotas de autenticação (`src/routes/authRoutes.ts`), defina as rotas `POST /api/auth/request-magic-link` e `GET /api/auth/magic-link-login`.
    *   **Verificação**: Solicite um magic link, verifique o token gerado nos logs e use-o para tentar fazer login. Confirme que o link funciona uma única vez e que links inválidos/expirados são rejeitados.

## Próxima Tarefa:

Após a conclusão desta tarefa, o módulo de autenticação estará funcional. A próxima etapa será a `Tarefa 9: Implementar o Módulo de Assinaturas (Kiwify)`.