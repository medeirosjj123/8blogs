import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Home: () => <div>Home Icon</div>,
  BookOpen: () => <div>BookOpen Icon</div>,
  Users: () => <div>Users Icon</div>,
  Wrench: () => <div>Wrench Icon</div>,
  User: () => <div>User Icon</div>,
}));

describe('BottomNav Component', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  it('should render all navigation items', () => {
    renderWithRouter(<BottomNav />);
    
    expect(screen.getByText('Início')).toBeInTheDocument();
    expect(screen.getByText('Cursos')).toBeInTheDocument();
    expect(screen.getByText('Comunidade')).toBeInTheDocument();
    expect(screen.getByText('Ferramentas')).toBeInTheDocument();
    expect(screen.getByText('Perfil')).toBeInTheDocument();
  });

  it('should have correct links', () => {
    renderWithRouter(<BottomNav />);
    
    const links = screen.getAllByRole('link');
    const hrefs = links.map(link => link.getAttribute('href'));
    
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/cursos');
    expect(hrefs).toContain('/comunidade');
    expect(hrefs).toContain('/ferramentas');
    expect(hrefs).toContain('/perfil');
  });

  it('should apply active class to current route', () => {
    // Mock current location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/cursos' },
      writable: true,
    });
    
    renderWithRouter(<BottomNav />);
    
    const coursesLink = screen.getByText('Cursos').closest('a');
    expect(coursesLink?.className).toContain('text-coral-500');
  });

  it('should be responsive and fixed at bottom', () => {
    const { container } = renderWithRouter(<BottomNav />);
    
    const nav = container.querySelector('nav');
    expect(nav?.className).toContain('fixed');
    expect(nav?.className).toContain('bottom-0');
    expect(nav?.className).toContain('z-50');
  });
});