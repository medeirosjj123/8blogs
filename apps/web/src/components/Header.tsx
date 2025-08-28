import React from 'react';
import { Search } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="px-4 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex md:hidden items-center">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <span className="ml-2 text-lg font-semibold text-neutral-900">Escola do SEO</span>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <div className="w-8 h-8 bg-neutral-200 rounded-full"></div>
          </div>
        </div>
      </div>
    </header>
  );
};