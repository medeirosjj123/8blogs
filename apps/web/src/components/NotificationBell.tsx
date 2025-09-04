import React from 'react';
import { Bell, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotificationBell: React.FC = () => {
  return (
    <Link
      to="/notifications"
      className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
      title="Notificações (Em manutenção)"
    >
      <Bell size={20} />
      {/* Maintenance indicator */}
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
        <Wrench size={10} className="text-white" />
      </div>
    </Link>
  );
};