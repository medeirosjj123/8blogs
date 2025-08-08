# Tarefa 10: Implementar o Módulo de Cursos & Conteúdo

*   **Arquivo**: `tasks/task10_implement_courses_content.md`
*   **Objetivo**: Desenvolver a estrutura para gerenciar e exibir o conteúdo do curso, incluindo módulos, lições e o player de vídeo.
*   **Referência no `tatame.md`**: Seção "3.3) Cursos & Conteúdo".

---

## Instruções de Ação:

Este módulo será implementado em etapas, focando na exibição do conteúdo.

---

#### **10.1. Subtarefa: Definir Modelos de Curso, Módulo e Lição**

1.  **Objetivo**: Criar os schemas e modelos Mongoose para representar a estrutura hierárquica do curso (Curso -> Módulo -> Lição).
2.  **Ação**: Crie os arquivos de modelo (`src/models/Course.ts`, `src/models/Module.ts`, `src/models/Lesson.ts`) no backend, definindo os schemas com campos como `title`, `description`, `order`, `videoUrl`, `materials`, etc.

---

#### **10.2. Subtarefa: Implementar Rotas de Conteúdo do Curso**

1.  **Objetivo**: Criar rotas da API para listar cursos, módulos e lições, permitindo que o frontend acesse o conteúdo.
2.  **Ação**:
    *   Crie um controlador de curso (`src/controllers/courseController.ts`) com funções para listar cursos, obter detalhes de um curso/módulo/lição.
    *   Crie um arquivo de rotas de curso (`src/routes/courseRoutes.ts`) e defina as rotas necessárias (ex: `GET /api/courses`, `GET /api/courses/:courseId/modules`, `GET /api/lessons/:lessonId`).
    *   Integre essas rotas ao arquivo principal da aplicação backend (`src/index.ts`).
    *   **Verificação**: Teste as rotas para garantir que os dados de curso (ainda que mockados ou inseridos manualmente no DB) podem ser acessados.

---

#### **10.3. Subtarefa: Implementar Controle de Progresso da Lição**

1.  **Objetivo**: Desenvolver a funcionalidade para registrar o progresso do usuário em cada lição.
2.  **Ação**:
    *   Crie o modelo `LessonProgress` (`src/models/LessonProgress.ts`) no backend, vinculando `userId` e `lessonId`.
    *   Adicione rotas na API para marcar uma lição como concluída (`POST /api/lessons/:lessonId/complete`) e para obter o progresso do usuário em um curso (`GET /api/courses/:courseId/progress`).
    *   **Verificação**: Marque uma lição como concluída e verifique se o progresso é registrado no banco de dados.

---

#### **10.4. Subtarefa: Configurar Player de Vídeo (Vimeo)**

1.  **Objetivo**: Preparar o frontend para exibir vídeos do Vimeo.
2.  **Ação**:
    *   No frontend (`apps/web`), adicione um componente de player de vídeo que possa incorporar URLs do Vimeo.
    *   Configure a privacidade dos vídeos no Vimeo para permitir apenas o domínio do Tatame.
    *   **Verificação**: Exiba um vídeo de teste em uma página do frontend para confirmar que o player funciona e que as configurações de privacidade estão corretas.

## Próxima Tarefa:

Após a conclusão desta tarefa, o módulo de cursos e conteúdo estará funcional. A próxima etapa será a `Tarefa 11: Implementar o Módulo de Comunidade (Slack-like)`.
