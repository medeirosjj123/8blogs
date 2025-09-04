import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, Calendar, Clock, Video, Search, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

interface WeeklyCall {
  _id: string;
  title: string;
  description: string;
  date: string;
  duration: number;
  maxParticipants: number;
  zoomLink?: string;
  recordingLink?: string;
  topics: string[];
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  registeredUsers: string[];
  attendedUsers: string[];
  registrationDeadline?: string;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  currentParticipants: number;
  availableSpots: number;
  isFull: boolean;
  canRegister: boolean;
}

interface CallFormData {
  title: string;
  description: string;
  date: string;
  duration: number;
  maxParticipants: number;
  zoomLink: string;
  recordingLink: string;
  topics: string[];
  registrationDeadline: string;
  isRecurring: boolean;
  recurringPattern?: {
    frequency: 'weekly' | 'monthly';
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
}

const WeeklyCalls: React.FC = () => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<WeeklyCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCall, setEditingCall] = useState<WeeklyCall | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [formData, setFormData] = useState<CallFormData>({
    title: '',
    description: '',
    date: '',
    duration: 60,
    maxParticipants: 25,
    zoomLink: '',
    recordingLink: '',
    topics: [],
    registrationDeadline: '',
    isRecurring: false,
    recurringPattern: undefined
  });

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/calls', {
        params: {
          page: 1,
          limit: 100
        }
      });
      
      if (response.data.success) {
        setCalls(response.data.data.calls || []);
      } else {
        setError('Failed to load calls');
      }
    } catch (err: any) {
      console.error('Error fetching calls:', err);
      setError(err.response?.data?.message || 'Failed to load calls');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCall(null);
    setFormData({
      title: '',
      description: '',
      date: '',
      duration: 60,
      maxParticipants: 25,
      zoomLink: '',
      recordingLink: '',
      topics: [],
      registrationDeadline: '',
      isRecurring: false,
      recurringPattern: undefined
    });
    setShowForm(true);
  };

  const handleEdit = (call: WeeklyCall) => {
    setEditingCall(call);
    setFormData({
      title: call.title,
      description: call.description,
      date: new Date(call.date).toISOString().slice(0, 16),
      duration: call.duration,
      maxParticipants: call.maxParticipants,
      zoomLink: call.zoomLink || '',
      recordingLink: call.recordingLink || '',
      topics: call.topics,
      registrationDeadline: call.registrationDeadline ? new Date(call.registrationDeadline).toISOString().slice(0, 16) : '',
      isRecurring: call.isRecurring,
      recurringPattern: call.recurringPattern
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        date: new Date(formData.date).toISOString(),
        registrationDeadline: formData.registrationDeadline ? new Date(formData.registrationDeadline).toISOString() : undefined,
        topics: formData.topics.filter(topic => topic.trim() !== '')
      };

      if (editingCall) {
        await api.put(`/api/calls/${editingCall._id}`, payload);
      } else {
        await api.post('/api/calls', payload);
      }

      setShowForm(false);
      fetchCalls();
    } catch (err: any) {
      console.error('Error saving call:', err);
      setError(err.response?.data?.message || 'Failed to save call');
    }
  };

  const handleDelete = async (callId: string) => {
    if (!confirm('Are you sure you want to delete this call?')) return;
    
    try {
      await api.delete(`/api/calls/${callId}`);
      fetchCalls();
    } catch (err: any) {
      console.error('Error deleting call:', err);
      setError(err.response?.data?.message || 'Failed to delete call');
    }
  };

  const handleTopicAdd = (topic: string) => {
    if (topic.trim() && !formData.topics.includes(topic.trim())) {
      setFormData(prev => ({
        ...prev,
        topics: [...prev.topics, topic.trim()]
      }));
    }
  };

  const handleTopicRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      topics: prev.topics.filter((_, i) => i !== index)
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'text-blue-400 bg-blue-400/10';
      case 'live': return 'text-green-400 bg-green-400/10';
      case 'completed': return 'text-gray-400 bg-gray-400/10';
      case 'cancelled': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const filteredCalls = calls.filter(call => {
    const matchesSearch = call.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         call.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         call.topics.some(topic => topic.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || call.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-1/4"></div>
          <div className="h-64 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Chamadas Semanais</h1>
          <p className="text-slate-400">Gerencie as chamadas premium da plataforma</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-coral hover:bg-coral/80 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Chamada
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar chamadas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-coral"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
          >
            <option value="all">Todos os Status</option>
            <option value="upcoming">Próximas</option>
            <option value="live">Ao Vivo</option>
            <option value="completed">Concluídas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Chamada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Participantes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredCalls.map((call) => (
                <tr key={call._id} className="hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-white">{call.title}</div>
                      <div className="text-sm text-slate-400 truncate max-w-xs">
                        {call.description}
                      </div>
                      {call.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {call.topics.slice(0, 3).map((topic, index) => (
                            <span
                              key={index}
                              className="inline-block bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded"
                            >
                              {topic}
                            </span>
                          ))}
                          {call.topics.length > 3 && (
                            <span className="text-slate-400 text-xs">+{call.topics.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Calendar className="w-4 h-4" />
                      {formatDate(call.date)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                      <Clock className="w-4 h-4" />
                      {call.duration} minutos
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Users className="w-4 h-4" />
                      {call.currentParticipants} / {call.maxParticipants}
                    </div>
                    {call.isFull && (
                      <div className="text-xs text-red-400 mt-1">Lotado</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(call.status)}`}>
                      {call.status === 'upcoming' && 'Próxima'}
                      {call.status === 'live' && 'Ao Vivo'}
                      {call.status === 'completed' && 'Concluída'}
                      {call.status === 'cancelled' && 'Cancelada'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {call.zoomLink && (
                        <a
                          href={call.zoomLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                          title="Abrir Zoom"
                        >
                          <Video className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleEdit(call)}
                        className="text-slate-400 hover:text-white"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(call._id)}
                        className="text-red-400 hover:text-red-300"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredCalls.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma chamada encontrada</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg border border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {editingCall ? 'Editar Chamada' : 'Nova Chamada'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Nome da chamada"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descrição *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral h-24 resize-none"
                  placeholder="Descreva o conteúdo da chamada"
                />
              </div>

              {/* Date and Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Data e Hora *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Duração (minutos) *
                  </label>
                  <input
                    type="number"
                    required
                    min="15"
                    max="300"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                </div>
              </div>

              {/* Max Participants and Registration Deadline */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Máximo de Participantes *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Prazo de Inscrição
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.registrationDeadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, registrationDeadline: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                </div>
              </div>

              {/* Zoom Link */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Link do Zoom
                </label>
                <input
                  type="url"
                  value={formData.zoomLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, zoomLink: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="https://zoom.us/..."
                />
              </div>

              {/* Recording Link */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Link da Gravação
                </label>
                <input
                  type="url"
                  value={formData.recordingLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, recordingLink: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="https://..."
                />
              </div>

              {/* Topics */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tópicos
                </label>
                <div className="space-y-2">
                  {formData.topics.map((topic, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => {
                          const newTopics = [...formData.topics];
                          newTopics[index] = e.target.value;
                          setFormData(prev => ({ ...prev, topics: newTopics }));
                        }}
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                        placeholder="Nome do tópico"
                      />
                      <button
                        type="button"
                        onClick={() => handleTopicRemove(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleTopicAdd('')}
                    className="text-coral hover:text-coral/80 text-sm"
                  >
                    + Adicionar Tópico
                  </button>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-coral hover:bg-coral/80 text-white rounded-lg transition-colors"
                >
                  {editingCall ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyCalls;