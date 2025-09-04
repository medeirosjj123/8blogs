import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Users, Wrench, User, Trophy, LogOut, Sparkles, Shield, Search, Video, BarChart3, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUsage } from '../hooks/useUsage';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
}

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { usage } = useUsage();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  // Base navigation items
  const baseNavItems: NavItem[] = [
    { path: '/', icon: <Home size={18} />, label: 'Dashboard' },
    { path: '/meus-sites', icon: <BarChart3 size={18} />, label: 'Meus Sites' },
    { path: '/ferramentas/gerador-reviews', icon: <Zap size={18} />, label: 'Gerar Conteúdo' },
    { path: '/cursos', icon: <BookOpen size={18} />, label: 'Cursos' },
    { path: '/comunidade', icon: <Users size={18} />, label: 'Comunidade' },
    { path: '/descobrir', icon: <Search size={18} />, label: 'Descobrir' },
    { path: '/ferramentas', icon: <Wrench size={18} />, label: 'Ferramentas' },
    { path: '/perfil', icon: <User size={18} />, label: 'Perfil' },
  ];

  // Add weekly calls for Premium users
  const navItems = usage?.features?.weeklyCalls 
    ? [
        ...baseNavItems.slice(0, 6), // Everything before 'Perfil'
        { path: '/chamadas', icon: <Video size={18} />, label: 'Chamadas Premium' },
        baseNavItems[6] // 'Perfil' at the end
      ]
    : baseNavItems;

  const userBelt = 'azul';
  const userLevel = 15;

  return (
    <aside className="hidden md:flex md:w-72 md:flex-col bg-white/80 backdrop-blur-xl border-r border-bloghouse-primary-200 gradient-glass">
      <div className="flex-1 flex flex-col pt-6 pb-4">
        {/* Logo */}
        <div className="px-6 mb-8">
          <div className="flex items-center">
            <div className="relative">
              <div className="w-11 h-11 gradient-primary rounded-2xl flex items-center justify-center bloghouse-glow">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 gradient-accent rounded-full border-2 border-white"></div>
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold bg-gradient-to-r from-bloghouse-primary-700 to-bloghouse-secondary-700 bg-clip-text text-transparent">
                Blog House
              </h1>
              <p className="text-xs text-bloghouse-gray-500">Plataforma para Blogueiros</p>
            </div>
          </div>
        </div>

        {/* User Progress Card */}
        <div className="px-4 mb-6">
          {usage?.plan === 'black_belt' ? (
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-4 border border-yellow-200 gradient-glass">
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={16} className="text-yellow-600" />
                <span className="text-sm font-bold text-yellow-800">BLACK BELT</span>
              </div>
              <p className="text-xs text-yellow-700 mb-3">Elite dos Afiliados 🥋</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-yellow-600">Recursos</span>
                <span className="text-xs text-yellow-800 bg-yellow-200 px-2 py-0.5 rounded-full font-semibold">
                  ILIMITADOS
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-bloghouse-primary-50 to-bloghouse-secondary-50 rounded-2xl p-4 border border-bloghouse-primary-200 gradient-glass">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-bloghouse-primary-500" />
                  <span className="text-xs font-semibold text-bloghouse-gray-700">
                    Plano {user?.subscription?.plan ? user.subscription.plan.charAt(0).toUpperCase() + user.subscription.plan.slice(1) : 'Starter'}
                  </span>
                </div>
                <span className="text-xs text-bloghouse-gray-500 bg-white px-2 py-0.5 rounded-full">
                  {user?.subscription?.blogsLimit === -1 
                    ? '∞ blogs' 
                    : `${user?.subscription?.blogsLimit || 1} ${(user?.subscription?.blogsLimit || 1) === 1 ? 'blog' : 'blogs'}`
                  }
                </span>
              </div>
            </div>
          )}
        </div>

        
        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/ferramentas'}
              className={({ isActive }) =>
                `group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'gradient-primary text-white bloghouse-glow'
                    : 'text-bloghouse-gray-600 hover:bg-bloghouse-primary-50 hover:text-bloghouse-gray-900'
                }`
              }
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          {/* Admin Access */}
          {user?.role === 'admin' && (
            <>
              <div className="px-4 py-2">
                <div className="h-px bg-slate-200" />
              </div>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'gradient-secondary text-white bloghouse-glow-secondary'
                      : 'text-orange-600 hover:bg-orange-50 hover:text-orange-800 border border-orange-200'
                  }`
                }
              >
                <Shield size={18} className="mr-3" />
                Admin Panel
              </NavLink>
            </>
          )}
        </nav>

        {/* Ranking Card */}
        <div className="px-4 mb-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-bloghouse-gray-900 to-bloghouse-gray-800 rounded-2xl p-4 text-white gradient-glass-dark">
            <div className="absolute top-0 right-0 w-20 h-20 bg-bloghouse-primary-500/10 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-400" />
                  <span className="text-sm font-semibold">Ranking Global</span>
                </div>
                <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full font-bold">
                  #15
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/10 rounded-full h-1.5">
                  <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full" style={{ width: '85%' }} />
                </div>
                <span className="text-[10px] text-white/70">Top 5%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="px-3">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-sm font-medium text-bloghouse-gray-500 hover:bg-bloghouse-primary-50 hover:text-bloghouse-gray-700 rounded-xl transition-all duration-200"
          >
            <LogOut size={18} className="mr-3" />
            Sair do Dojo
          </button>
        </div>
      </div>
    </aside>
  );
};