# Tarefa 19: Implementar a Navegação Principal (Bottom Nav)

*   **Arquivo**: `tasks/task19_implement_main_navigation.md`
*   **Objetivo**: Desenvolver o componente de navegação inferior (bottom nav) para a aplicação mobile-first, permitindo que o usuário acesse as principais seções da plataforma.
*   **Referência no `tatame.md`**: Seção "2) Branding & UI/UX" -> "Diretrizes de UI" -> "Mobile-first com bottom nav".

---

## Instruções de Ação:

Este módulo será implementado em etapas, focando na usabilidade e na experiência mobile.

---

#### **19.1. Subtarefa: Criar o Componente de Navegação Inferior**

1.  **Objetivo**: Desenvolver o componente React para a barra de navegação inferior.
2.  **Ação**:
    *   No frontend (`apps/web`), crie um novo componente (`components/BottomNav.tsx`).
    *   Utilize as diretrizes de UI (minimalista, cores preto/branco/vermelho, cantos 2xl) e os componentes `shadcn/ui` (se aplicável) para estilizar a barra.
    *   Inclua 5 ícones clicáveis: Home, Curso, Comunidade, Ferramentas, Perfil.
    *   **Verificação**: Renderize o componente em uma página de teste e confirme que ele é exibido corretamente na parte inferior da tela.

---

#### **19.2. Subtarefa: Integrar a Navegação com as Rotas da Aplicação**

1.  **Objetivo**: Conectar os ícones da navegação inferior às respectivas rotas da aplicação.
2.  **Ação**:
    *   Utilize uma biblioteca de roteamento (ex: `react-router-dom`) para definir as rotas para cada seção (ex: `/dashboard`, `/course`, `/community`, `/tools`, `/profile`).
    *   Configure os ícones da `BottomNav` para navegar para essas rotas quando clicados.
    *   **Verificação**: Clique em cada ícone da navegação e confirme que a página correspondente é carregada.

---

#### **19.3. Subtarefa: Implementar Estado Ativo e Responsividade**

1.  **Objetivo**: Fazer com que o ícone da navegação inferior reflita a página ativa e garantir que a navegação funcione bem em diferentes tamanhos de tela.
2.  **Ação**:
    *   Adicione lógica ao componente `BottomNav` para destacar visualmente o ícone da rota atualmente ativa.
    *   Garanta que o componente seja responsivo e se adapte bem a telas de dispositivos móveis.
    *   **Verificação**: Navegue entre as páginas e confirme que o ícone ativo é atualizado. Redimensione a janela do navegador para simular diferentes tamanhos de tela e verifique a responsividade.

## Próxima Tarefa:

Após a conclusão desta tarefa, a navegação principal estará implementada. A próxima etapa será a `Tarefa 20: Implementar o Módulo de Perfil e Conta do Usuário`.
