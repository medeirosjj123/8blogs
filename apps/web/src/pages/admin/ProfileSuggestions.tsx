import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, Edit2, Save, X, Loader2, Upload,
  Music, Heart, Dumbbell, Plane, Book, Film, Languages, Utensils,
  Briefcase, Target, Check, ToggleLeft, ToggleRight, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

interface Suggestion {
  _id: string;
  category: string;
  value: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: 'abilities', label: 'Habilidades', icon: Briefcase, color: 'bg-orange-500' },
  { value: 'interests', label: 'Interesses', icon: Target, color: 'bg-blue-500' },
  { value: 'music', label: 'Música', icon: Music, color: 'bg-pink-500' },
  { value: 'hobbies', label: 'Hobbies', icon: Heart, color: 'bg-purple-500' },
  { value: 'travel', label: 'Viagem', icon: Plane, color: 'bg-green-500' },
  { value: 'books', label: 'Livros', icon: Book, color: 'bg-amber-500' },
  { value: 'movies', label: 'Filmes', icon: Film, color: 'bg-red-500' },
  { value: 'languages', label: 'Idiomas', icon: Languages, color: 'bg-indigo-500' },
  { value: 'diet', label: 'Dieta', icon: Utensils, color: 'bg-teal-500' }
];

export default function ProfileSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('abilities');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newValue, setNewValue] = useState('');
  const [bulkValues, setBulkValues] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch('/api/suggestions', {
        headers: {
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      
      const data = await response.json();
      setSuggestions(data.data.suggestions || []);
    } catch (error) {
      toast.error('Erro ao carregar sugestões');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createSuggestion = async () => {
    if (!newValue.trim()) {
      toast.error('Digite uma sugestão');
      return;
    }

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          category: selectedCategory,
          value: newValue.trim(),
          order: suggestions.filter(s => s.category === selectedCategory).length
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast.success('Sugestão adicionada');
      setNewValue('');
      fetchSuggestions();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar sugestão');
    }
  };

  const bulkCreateSuggestions = async () => {
    if (!bulkValues.trim()) {
      toast.error('Digite as sugestões');
      return;
    }

    const values = bulkValues.split('\n').filter(v => v.trim());
    
    if (values.length === 0) {
      toast.error('Digite pelo menos uma sugestão');
      return;
    }

    try {
      const response = await fetch('/api/suggestions/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          category: selectedCategory,
          values
        })
      });

      if (!response.ok) throw new Error('Failed to create suggestions');
      
      const result = await response.json();
      
      toast.success(`${result.data.created} sugestões adicionadas`);
      
      if (result.data.errors && result.data.errors.length > 0) {
        toast.error(`${result.data.errors.length} duplicadas ignoradas`);
      }
      
      setBulkValues('');
      setShowBulkModal(false);
      fetchSuggestions();
    } catch (error) {
      toast.error('Erro ao adicionar sugestões em massa');
    }
  };

  const updateSuggestion = async (id: string) => {
    if (!editValue.trim()) {
      toast.error('Digite uma sugestão');
      return;
    }

    try {
      const response = await fetch(`/api/suggestions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          value: editValue.trim()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      toast.success('Sugestão atualizada');
      setEditingId(null);
      setEditValue('');
      fetchSuggestions();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar sugestão');
    }
  };

  const toggleSuggestionStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/suggestions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          isActive: !currentStatus
        })
      });

      if (!response.ok) throw new Error('Failed to update suggestion');

      toast.success(currentStatus ? 'Sugestão desativada' : 'Sugestão ativada');
      fetchSuggestions();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const deleteSuggestion = async (id: string) => {
    try {
      const response = await fetch(`/api/suggestions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${Cookies.get('access_token') || localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete suggestion');

      toast.success('Sugestão removida');
      fetchSuggestions();
    } catch (error) {
      toast.error('Erro ao remover sugestão');
    }
  };

  const filteredSuggestions = suggestions
    .filter(s => s.category === selectedCategory)
    .filter(s => searchTerm ? s.value.toLowerCase().includes(searchTerm.toLowerCase()) : true);

  const currentCategory = CATEGORIES.find(c => c.value === selectedCategory);
  const Icon = currentCategory?.icon || Briefcase;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sugestões de Perfil</h1>
          <p className="text-slate-400 mt-1">Gerencie as sugestões disponíveis para os usuários</p>
        </div>
        <button
          onClick={() => setShowBulkModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
        >
          <Upload className="w-4 h-4" />
          Adicionar em Massa
        </button>
      </div>

      {/* Category Tabs */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(category => {
            const CategoryIcon = category.icon;
            const isActive = selectedCategory === category.value;
            const count = suggestions.filter(s => s.category === category.value).length;
            
            return (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  isActive 
                    ? 'bg-coral text-white' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <CategoryIcon size={16} />
                <span>{category.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  isActive ? 'bg-white/20' : 'bg-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add New & Search */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 space-y-4">
        <div className="flex items-center gap-2 text-white mb-2">
          <Icon className={currentCategory?.color} size={20} />
          <h2 className="text-lg font-semibold">{currentCategory?.label}</h2>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createSuggestion()}
            placeholder={`Nova sugestão para ${currentCategory?.label}`}
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <button
            onClick={createSuggestion}
            className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Adicionar
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar sugestões..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>
      </div>

      {/* Suggestions List */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <div className="px-6 py-3 bg-slate-800 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            Sugestões ({filteredSuggestions.length})
          </h3>
        </div>
        
        <div className="divide-y divide-slate-800">
          {filteredSuggestions.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400">
              {searchTerm ? 'Nenhuma sugestão encontrada' : 'Nenhuma sugestão cadastrada para esta categoria'}
            </div>
          ) : (
            filteredSuggestions.map(suggestion => (
              <div
                key={suggestion._id}
                className={`flex items-center gap-3 px-6 py-3 hover:bg-slate-800/50 transition-colors ${
                  !suggestion.isActive && 'opacity-50'
                }`}
              >
                {editingId === suggestion._id ? (
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && updateSuggestion(suggestion._id)}
                      className="flex-1 px-3 py-1 bg-slate-800 border border-coral rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                      autoFocus
                    />
                    <button
                      onClick={() => updateSuggestion(suggestion._id)}
                      className="p-2 text-green-400 hover:bg-green-900/30 rounded-lg transition-colors"
                    >
                      <Save size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditValue('');
                      }}
                      className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-white">{suggestion.value}</span>
                    
                    <span className={`px-2 py-1 rounded text-xs ${
                      suggestion.isActive
                        ? 'bg-green-900/30 text-green-400 border border-green-800'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}>
                      {suggestion.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                    
                    <button
                      onClick={() => toggleSuggestionStatus(suggestion._id, suggestion.isActive)}
                      className={`p-2 rounded-lg transition-colors ${
                        suggestion.isActive
                          ? 'text-green-400 hover:bg-green-900/30'
                          : 'text-slate-400 hover:bg-slate-800'
                      }`}
                      title={suggestion.isActive ? 'Desativar' : 'Ativar'}
                    >
                      {suggestion.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    
                    <button
                      onClick={() => {
                        setEditingId(suggestion._id);
                        setEditValue(suggestion.value);
                      }}
                      className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    
                    <button
                      onClick={() => deleteSuggestion(suggestion._id)}
                      className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg border border-slate-800 max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Adicionar Sugestões em Massa</h3>
              <p className="text-sm text-slate-400 mt-1">Categoria: {currentCategory?.label}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <textarea
                value={bulkValues}
                onChange={(e) => setBulkValues(e.target.value)}
                placeholder="Digite uma sugestão por linha"
                rows={10}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-coral resize-none"
              />
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkValues('');
                  }}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={bulkCreateSuggestions}
                  className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors flex items-center gap-2"
                >
                  <Upload size={18} />
                  Adicionar Todas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}