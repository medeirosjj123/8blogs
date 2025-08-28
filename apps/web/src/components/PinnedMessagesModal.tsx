import React from 'react';
import { X, Pin, Hash, MessageCircle } from 'lucide-react';
import { usePinnedMessages } from '../hooks/useChat';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Channel } from '../services/socket.service';

interface PinnedMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel?: Channel;
}

export const PinnedMessagesModal: React.FC<PinnedMessagesModalProps> = ({
  isOpen,
  onClose,
  channel
}) => {
  const { data: pinnedMessages, isLoading } = usePinnedMessages(channel?.id || '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Pin className="text-coral" size={20} />
            <h2 className="text-lg font-semibold text-slate-900">
              Mensagens Fixadas
            </h2>
            {channel && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {channel.type === 'direct' ? (
                  <MessageCircle size={16} />
                ) : (
                  <Hash size={16} />
                )}
                <span>{channel.name}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-coral"></div>
            </div>
          ) : !pinnedMessages || pinnedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <Pin size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma mensagem fixada</p>
              <p className="text-sm">Fixe mensagens importantes para encontrá-las facilmente</p>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {pinnedMessages.map((message, index) => (
                <div
                  key={message.id}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50 hover:bg-slate-100 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {message.userName.substring(0, 2).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="font-semibold text-slate-900">
                          {message.userName}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(message.timestamp), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-coral">
                          <Pin size={12} />
                          <span>Fixada</span>
                        </div>
                      </div>
                      
                      {/* Content */}
                      {message.type === 'image' && message.metadata?.imageUrl ? (
                        <div>
                          <img 
                            src={message.metadata.imageUrl} 
                            alt="Imagem enviada" 
                            className="max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity mb-2"
                            onClick={() => window.open(message.metadata.imageUrl, '_blank')}
                          />
                          {message.content !== 'Imagem enviada' && (
                            <p className="text-slate-700 break-words">{message.content}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-700 break-words">{message.content}</p>
                      )}
                    </div>

                    {/* Pin indicator */}
                    <div className="text-coral">
                      <Pin size={16} />
                    </div>
                  </div>
                  
                  {/* Message number */}
                  <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-400">
                    Mensagem fixada #{index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            {pinnedMessages?.length || 0} mensagem{pinnedMessages?.length !== 1 ? 's' : ''} fixada{pinnedMessages?.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
};