import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart3,
  Users,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  User,
  ChevronDown,
  Mail,
  Layout,
  List,
  Package,
  Folder,
  Key,
  FileText,
  Activity,
  Cpu
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: BarChart3 },
  { name: 'Usuários', href: '/admin/users', icon: Users },
  { name: 'Cursos', href: '/admin/courses', icon: BookOpen },
  { name: 'Features', href: '/admin/features', icon: Package },
  { name: 'Categorias', href: '/admin/categories', icon: Folder },
  { name: 'Content Generation Hub', href: '/admin/content-hub', icon: Cpu },
  { name: 'Templates WordPress', href: '/admin/templates', icon: Layout },
  { name: 'Chamadas Semanais', href: '/admin/calls', icon: Activity },
  { name: 'Sugestões de Perfil', href: '/admin/profile-suggestions', icon: List },
  { name: 'Templates de Email', href: '/admin/email-templates', icon: Mail },
  { name: 'Configurações', href: '/admin/settings', icon: Settings },
];

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const goToDashboard = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transition-transform lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-coral rounded-lg flex items-center justify-center">
                <span className="font-bold text-white">T</span>
              </div>
              <div>
                <div className="font-semibold text-white">Tatame</div>
                <div className="text-xs text-slate-400">Admin</div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-coral text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-coral rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:pl-0">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-800 bg-slate-900 px-4 shadow-sm lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="h-6 w-px bg-slate-800 lg:hidden" />

          <div className="flex flex-1 gap-x-4 lg:gap-x-6">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-white">
                Painel Administrativo
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-x-4 lg:gap-x-6">
            {/* Back to main site */}
            <button
              onClick={goToDashboard}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Ir para o Site</span>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="w-8 h-8 bg-coral rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-lg border border-slate-700 py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-700">
                    <p className="text-sm font-medium text-white">{user?.name}</p>
                    <p className="text-xs text-slate-400">{user?.email}</p>
                    <p className="text-xs text-coral">Administrador</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 bg-slate-950">
          <Outlet />
        </main>
      </div>

      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-25 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};