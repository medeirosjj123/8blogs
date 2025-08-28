import React, { useState, useEffect } from 'react';
import {
  Save,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  TestTube,
  Loader2,
  Code,
  FileText,
  X
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Prompt {
  _id: string;
  code: string;
  name: string;
  content: string;
  variables: string[];
  category: string;
  order: number;
  isActive: boolean;
  isSystem: boolean;
  metadata?: {
    description?: string;
    example?: string;
    tips?: string;
  };
}

const categoryOptions = ['bbr', 'spr', 'informational'];

export const PromptLibrary: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('bbr');
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [testingPrompt, setTestingPrompt] = useState<string | null>(null);
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<string>('');
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    content: '',
    variables: [] as string[],
    category: 'reviews',
    metadata: {
      description: '',
      tips: ''
    }
  });

  useEffect(() => {
    fetchPrompts();
  }, [selectedCategory]);

  const fetchPrompts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/prompts', {
        headers: { Authorization: `Bearer ${token}` },
        params: { category: selectedCategory }
      });
      
      if (response.data.success) {
        setPrompts(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast.error('Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        '/api/admin/prompts/initialize',
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success('Default prompts initialized');
        await fetchPrompts();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to initialize');
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (editingPrompt) {
        // Update existing prompt
        const response = await axios.put(
          `/api/admin/prompts/${editingPrompt._id}`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data.success) {
          toast.success('Prompt updated successfully');
          setShowModal(false);
          setEditingPrompt(null);
          await fetchPrompts();
        }
      } else {
        // Create new prompt
        const response = await axios.post(
          '/api/admin/prompts',
          formData,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data.success) {
          toast.success('Prompt created successfully');
          setShowModal(false);
          await fetchPrompts();
        }
      }
    } catch (error: any) {
      console.error('Error saving prompt:', error);
      toast.error(error.response?.data?.message || 'Failed to save prompt');
    }
  };

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) {
      toast.error('Cannot delete system prompts');
      return;
    }

    if (!confirm('Are you sure you want to delete this prompt?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/admin/prompts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Prompt deleted successfully');
      await fetchPrompts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete prompt');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/admin/prompts/${id}/toggle`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      toast.success('Prompt status updated');
      await fetchPrompts();
    } catch (error) {
      toast.error('Failed to toggle prompt status');
    }
  };

  const handleTest = async (prompt: Prompt) => {
    setTestingPrompt(prompt._id);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `/api/admin/prompts/${prompt._id}/test`,
        { variables: testVariables },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setTestResult(response.data.data.compiled);
      }
    } catch (error) {
      toast.error('Failed to test prompt');
    } finally {
      setTestingPrompt(null);
    }
  };

  const extractVariables = (content: string): string[] => {
    const regex = /\{([^}]+)\}/g;
    const variables = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  };

  const getVariableDescription = (variable: string): string => {
    const descriptions: Record<string, string> = {
      'title': 'Título do artigo/review',
      'product_count': 'Número de produtos sendo analisados',
      'product_name': 'Nome do produto individual',
      'product_names': 'Lista de nomes dos produtos',
      'position': 'Posição do produto na lista (1, 2, 3...)',
      'total': 'Total de produtos/seções',
      'introduction': 'Conteúdo da introdução (limitado)',
      'full_content': '📝 TODO o conteúdo gerado na sessão - para conclusões contextuais',
      'outline_topics': 'Lista dos tópicos do outline',
      'section_title': 'Título da seção atual',
      'section_description': 'Descrição da seção atual',
      'previous_context': 'Contexto das seções anteriores'
    };
    return descriptions[variable] || 'Variável personalizada';
  };

  const openEditModal = (prompt?: Prompt) => {
    if (prompt) {
      setEditingPrompt(prompt);
      setFormData({
        code: prompt.code,
        name: prompt.name,
        content: prompt.content,
        variables: prompt.variables,
        category: prompt.category,
        metadata: prompt.metadata || { description: '', tips: '' }
      });
    } else {
      setEditingPrompt(null);
      setFormData({
        code: '',
        name: '',
        content: '',
        variables: [],
        category: selectedCategory,
        metadata: { description: '', tips: '' }
      });
    }
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Prompts do Gerador de Conteúdo</h1>
          <p className="text-slate-400 mt-1">Gerencie os prompts para BBR, SPR e conteúdo informacional</p>
        </div>
        <div className="flex gap-2">
          {prompts.length === 0 && (
            <button
              onClick={handleInitialize}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Initialize Defaults
            </button>
          )}
          <button
            onClick={() => openEditModal()}
            className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral/80"
          >
            <Plus size={20} />
            New Prompt
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6">
        {categoryOptions.map(category => {
          const labels: Record<string, string> = {
            'bbr': 'BBR (Melhores)',
            'spr': 'SPR (Único)',
            'informational': 'Informacional'
          };
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg ${
                selectedCategory === category
                  ? 'bg-coral text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {labels[category] || category}
            </button>
          );
        })}
      </div>

      {/* Prompts List - Grouped by Article Position */}
      <div className="space-y-6">
        {/* Group prompts by order */}
        {[1, 2, 3].map(order => {
          const orderPrompts = prompts.filter(p => p.order === order);
          if (orderPrompts.length === 0) return null;
          
          const sectionLabels: Record<number, string> = {
            1: '📝 Introdução do Artigo',
            2: '📦 Conteúdo Principal (Produtos/Seções)',
            3: '✅ Conclusão do Artigo'
          };
          
          return (
            <div key={order}>
              <h2 className="text-lg font-semibold text-slate-300 mb-3 flex items-center gap-2">
                {sectionLabels[order]}
                <span className="text-sm text-slate-500">
                  (Posição {order} no artigo)
                </span>
              </h2>
              <div className="space-y-4">
                {orderPrompts.map(prompt => (
                  <div key={prompt._id} className="bg-slate-800 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">{prompt.name}</h3>
                  {prompt.isSystem && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                      System
                    </span>
                  )}
                  {!prompt.isActive && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400 font-mono">{prompt.code}</p>
                {prompt.metadata?.description && (
                  <p className="text-sm text-slate-500 mt-1">{prompt.metadata.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggle(prompt._id)}
                  className="p-2 text-slate-400 hover:text-white"
                  title={prompt.isActive ? 'Deactivate' : 'Activate'}
                >
                  {prompt.isActive ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
                <button
                  onClick={() => openEditModal(prompt)}
                  className="p-2 text-blue-500 hover:text-blue-400"
                  title="Edit"
                >
                  <Edit2 size={20} />
                </button>
                {!prompt.isSystem && (
                  <button
                    onClick={() => handleDelete(prompt._id, prompt.isSystem)}
                    className="p-2 text-red-500 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Variables */}
            {prompt.variables.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-slate-400 mb-2">Variables:</p>
                <div className="flex flex-wrap gap-2">
                  {prompt.variables.map(variable => (
                    <span
                      key={variable}
                      className="px-2 py-1 bg-slate-700 text-slate-300 text-sm rounded cursor-help"
                      title={getVariableDescription(variable)}
                    >
                      {`{${variable}}`}
                      {variable === 'full_content' && (
                        <span className="ml-1 text-yellow-400">⭐</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="bg-slate-900 rounded p-4 mb-4">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap">
                {prompt.content.substring(0, 300)}
                {prompt.content.length > 300 && '...'}
              </pre>
            </div>

            {/* Test Section */}
            <details className="border-t border-slate-700 pt-4">
              <summary className="cursor-pointer text-sm text-slate-400 hover:text-white">
                Test Prompt
              </summary>
              <div className="mt-4 space-y-4">
                {prompt.variables.map(variable => (
                  <div key={variable}>
                    <label className="text-sm text-slate-400">{variable}:</label>
                    <input
                      type="text"
                      value={testVariables[variable] || ''}
                      onChange={(e) => setTestVariables(prev => ({
                        ...prev,
                        [variable]: e.target.value
                      }))}
                      className="w-full bg-slate-700 text-white p-2 rounded mt-1"
                      placeholder={`Enter ${variable}...`}
                    />
                  </div>
                ))}
                <button
                  onClick={() => handleTest(prompt)}
                  disabled={testingPrompt === prompt._id}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {testingPrompt === prompt._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <TestTube size={16} />
                  )}
                  Test
                </button>
                {testResult && (
                  <div className="bg-slate-900 rounded p-4">
                    <pre className="text-sm text-slate-300 whitespace-pre-wrap">{testResult}</pre>
                  </div>
                )}
              </div>
            </details>
          </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingPrompt ? 'Edit Prompt' : 'New Prompt'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400">Code</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full bg-slate-700 text-white p-2 rounded mt-1"
                      placeholder="unique_code"
                      disabled={editingPrompt?.isSystem}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-700 text-white p-2 rounded mt-1"
                      placeholder="Prompt Name"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-400">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-700 text-white p-2 rounded mt-1"
                  >
                    {categoryOptions.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-400">Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => {
                      const content = e.target.value;
                      const variables = extractVariables(content);
                      setFormData({ ...formData, content, variables });
                    }}
                    className="w-full bg-slate-700 text-white p-2 rounded mt-1 font-mono"
                    rows={15}
                    placeholder="Enter your prompt content..."
                  />
                </div>

                {formData.variables.length > 0 && (
                  <div>
                    <label className="text-sm text-slate-400">Detected Variables</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.variables.map(variable => (
                        <span
                          key={variable}
                          className="px-2 py-1 bg-slate-700 text-slate-300 text-sm rounded cursor-help"
                          title={getVariableDescription(variable)}
                        >
                          {`{${variable}}`}
                          {variable === 'full_content' && (
                            <span className="ml-1 text-yellow-400">⭐</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm text-slate-400">Description</label>
                  <input
                    type="text"
                    value={formData.metadata.description}
                    onChange={(e) => setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, description: e.target.value }
                    })}
                    className="w-full bg-slate-700 text-white p-2 rounded mt-1"
                    placeholder="Brief description of what this prompt does..."
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400">Tips</label>
                  <textarea
                    value={formData.metadata.tips}
                    onChange={(e) => setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, tips: e.target.value }
                    })}
                    className="w-full bg-slate-700 text-white p-2 rounded mt-1"
                    rows={3}
                    placeholder="Usage tips..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded hover:bg-coral/80"
                >
                  <Save size={16} />
                  Save Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};