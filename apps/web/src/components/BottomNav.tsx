import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Users, Wrench, User } from 'lucide-react';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
}

export const BottomNav: React.FC = () => {
  const navItems: NavItem[] = [
    { path: '/', icon: <Home size={20} />, label: 'Início' },
    { path: '/cursos', icon: <BookOpen size={20} />, label: 'Cursos' },
    { path: '/comunidade', icon: <Users size={20} />, label: 'Chat' },
    { path: '/ferramentas', icon: <Wrench size={20} />, label: 'Tools' },
    { path: '/perfil', icon: <User size={20} />, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 md:hidden z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-3 py-2 transition-colors ${
                isActive
                  ? 'text-brand'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`
            }
          >
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};