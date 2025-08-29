import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, BookOpen, Users, Wrench, User, Trophy, LogOut, Sparkles, Shield, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
}

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  const navItems: NavItem[] = [
    { path: '/', icon: <Home size={18} />, label: 'Dashboard' },
    { path: '/cursos', icon: <BookOpen size={18} />, label: 'Cursos' },
    { path: '/comunidade', icon: <Users size={18} />, label: 'Comunidade' },
    { path: '/descobrir', icon: <Search size={18} />, label: 'Descobrir' },
    { path: '/ferramentas', icon: <Wrench size={18} />, label: 'Ferramentas' },
    { path: '/perfil', icon: <User size={18} />, label: 'Perfil' },
  ];

  const userBelt = 'azul';
  const userLevel = 15;

  return (
    <aside className="hidden md:flex md:w-72 md:flex-col bg-white/80 backdrop-blur-xl border-r border-slate-100">
      <div className="flex-1 flex flex-col pt-6 pb-4">
        {/* Logo */}
        <div className="px-6 mb-8">
          <div className="flex items-center">
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-slate-800 to-slate-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">8</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gradient-to-br from-coral-light to-coral rounded-full border-2 border-white"></div>
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                8blogs
              </h1>
              <p className="text-xs text-slate-500">Plataforma para Blogueiros</p>
            </div>
          </div>
        </div>

        {/* User Progress Card */}
        <div className="px-4 mb-6">
          <div className="bg-gradient-to-br from-slate-50 to-sand-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-coral" />
                <span className="text-xs font-semibold text-slate-700">Plano Pro</span>
              </div>
              <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-full">
                3 blogs
              </span>
            </div>
            <div className="space-y-2">
              <div className="w-full bg-white rounded-full h-2.5 overflow-hidden shadow-inner">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 shadow-sm" 
                  style={{ width: '65%' }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-medium">45/100</span>
                <span className="text-[10px] text-slate-400">reviews</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-coral to-rose-400 text-white shadow-lg shadow-coral/20'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/20'
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
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white">
            <div className="absolute top-0 right-0 w-20 h-20 bg-coral/10 rounded-full blur-2xl" />
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
            className="w-full flex items-center px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-xl transition-all duration-200"
          >
            <LogOut size={18} className="mr-3" />
            Sair do Dojo
          </button>
        </div>
      </div>
    </aside>
  );
};