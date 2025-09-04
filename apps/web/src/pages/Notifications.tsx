import React from 'react';
import { ArrowLeft, Wrench, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Notifications: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          to="/dashboard" 
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notificações</h1>
          <p className="text-sm text-slate-600">Central de notificações e alertas</p>
        </div>
      </div>

      {/* Maintenance Message */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-gradient-to-r from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wrench className="w-10 h-10 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Sistema em Manutenção
          </h2>
          <p className="text-slate-600 mb-6">
            Estamos trabalhando para melhorar o sistema de notificações. 
            Esta funcionalidade estará disponível em breve.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-slate-700">
              <strong>Por enquanto:</strong> Você receberá notificações importantes por email 
              e dentro das funcionalidades específicas (comunidade, cursos, etc).
            </p>
          </div>
          <Link 
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            <Bell size={16} />
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};