import React, { useState } from 'react';
import { X, Hash, Lock, Users } from 'lucide-react';
import { useCreateChannel } from '../hooks/useChat';

interface ChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChannelModal: React.FC<ChannelModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'public' | 'private'>('public');
  const [category, setCategory] = useState<'general' | 'course' | 'support' | 'announcement'>('general');
  
  const createChannel = useCreateChannel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    try {
      await createChannel.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        type
      });
      
      // Reset form and close modal
      setName('');
      setDescription('');
      setType('public');
      setCategory('general');
      onClose();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Criar Novo Canal</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Channel Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome do Canal
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: marketing, vendas, suporte"
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sobre o que é este canal?"
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent resize-none"
            />
          </div>

          {/* Channel Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipo de Canal
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('public')}
                className={`flex items-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ${
                  type === 'public'
                    ? 'border-coral bg-coral/5 text-coral'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Hash size={18} />
                <div className="text-left">
                  <div className="font-medium">Público</div>
                  <div className="text-xs opacity-75">Todos podem ver e participar</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setType('private')}
                className={`flex items-center gap-2 px-4 py-3 border-2 rounded-lg transition-all ${
                  type === 'private'
                    ? 'border-coral bg-coral/5 text-coral'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <Lock size={18} />
                <div className="text-left">
                  <div className="font-medium">Privado</div>
                  <div className="text-xs opacity-75">Apenas convidados</div>
                </div>
              </button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
            >
              <option value="general">Geral</option>
              <option value="course">Curso</option>
              <option value="support">Suporte</option>
              <option value="announcement">Anúncios</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createChannel.isPending}
              className="flex-1 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createChannel.isPending ? 'Criando...' : 'Criar Canal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};