import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, Copy, Reply, Pin, PinOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface MessageActionsProps {
  messageId: string;
  userId: string;
  currentUserId: string;
  content: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  isPinned: boolean;
  position: { x: number; y: number };
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  messageId,
  userId,
  currentUserId,
  content,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onPin,
  onUnpin,
  onReply,
  isPinned,
  position
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showEditInput, setShowEditInput] = useState(false);
  const [editContent, setEditContent] = useState(content);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
        setShowEditInput(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success('Mensagem copiada!');
    onClose();
  };

  const handleEdit = () => {
    setShowEditInput(true);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== content) {
      onEdit(messageId, editContent);
    }
    setShowEditInput(false);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja excluir esta mensagem?')) {
      onDelete(messageId);
      onClose();
    }
  };

  const handlePin = () => {
    if (isPinned) {
      onUnpin(messageId);
    } else {
      onPin(messageId);
    }
    onClose();
  };

  if (!isOpen) return null;

  const isOwnMessage = userId === currentUserId;

  return (
    <div
      ref={menuRef}
      className="absolute z-[9999] bg-white rounded-lg shadow-2xl border border-slate-200 py-1 min-w-[160px]"
      style={{
        position: 'fixed',
        top: Math.max(10, Math.min(position.y, window.innerHeight - 250)),
        left: Math.max(10, Math.min(position.x - 160, window.innerWidth - 200)),
        zIndex: 9999
      }}
    >
      {showEditInput ? (
        <div className="p-2">
          <input
            type="text"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSaveEdit();
              }
            }}
            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
            autoFocus
          />
          <div className="flex gap-1 mt-2">
            <button
              onClick={handleSaveEdit}
              className="flex-1 px-2 py-1 text-xs bg-coral text-white rounded hover:bg-coral-dark transition-colors"
            >
              Salvar
            </button>
            <button
              onClick={() => {
                setShowEditInput(false);
                setEditContent(content);
              }}
              className="flex-1 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
          >
            <Copy size={16} />
            <span>Copiar</span>
          </button>

          {onReply && (
            <button
              onClick={() => {
                onReply(messageId);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
            >
              <Reply size={16} />
              <span>Responder</span>
            </button>
          )}

          <button
            onClick={handlePin}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
          >
            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
            <span>{isPinned ? 'Desafixar' : 'Fixar mensagem'}</span>
          </button>

          {isOwnMessage && (
            <>
              <button
                onClick={handleEdit}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <Edit2 size={16} />
                <span>Editar</span>
              </button>

              <div className="my-1 border-t border-slate-200" />

              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <Trash2 size={16} />
                <span>Excluir</span>
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};