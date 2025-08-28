import React, { useState } from 'react';
import { X, Send, UserPlus } from 'lucide-react';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    bio?: string;
    avatar?: string;
    role: string;
  };
  onSend: (message: string) => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  user,
  onSend
}) => {
  const [message, setMessage] = useState('');
  const [isQuickMessage, setIsQuickMessage] = useState(false);

  const quickMessages = [
    'Olá! Gostaria de me conectar com você.',
    'Vi seu perfil e achei interessante. Vamos nos conectar?',
    'Tenho interesse em trocar experiências sobre SEO. Podemos nos conectar?',
    'Adoraria fazer parte da sua rede de contatos!',
  ];

  const handleSend = () => {
    const finalMessage = message.trim() || quickMessages[0];
    onSend(finalMessage);
  };

  const handleQuickMessage = (msg: string) => {
    setMessage(msg);
    setIsQuickMessage(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserPlus className="text-coral" size={24} />
              <h2 className="text-xl font-semibold text-slate-900">Enviar Solicitação de Conexão</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* User Info */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-coral to-coral-dark rounded-full flex items-center justify-center text-white font-bold text-xl">
                {user.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-semibold text-slate-900 text-lg">{user.name}</h3>
              <p className="text-sm text-slate-500">{user.role}</p>
              {user.bio && (
                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{user.bio}</p>
              )}
            </div>
          </div>

          {/* Message */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mensagem (opcional)
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setIsQuickMessage(false);
              }}
              placeholder="Escreva uma mensagem personalizada..."
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
              rows={4}
            />
            <p className="text-xs text-slate-500 mt-1">
              {message.length}/500 caracteres
            </p>
          </div>

          {/* Quick Messages */}
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-700 mb-2">Mensagens rápidas:</p>
            <div className="space-y-2">
              {quickMessages.map((msg, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickMessage(msg)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    message === msg && isQuickMessage
                      ? 'bg-coral/10 text-coral border border-coral'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSend}
              className="flex-1 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors flex items-center justify-center gap-2"
            >
              <Send size={18} />
              Enviar Solicitação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};