import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Plus,
  Edit,
  Trash2,
  Send,
  Eye,
  EyeOff,
  Code,
  Save,
  X,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Bell,
  ShoppingBag,
  Download,
  Upload,
  Palette
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import toast from 'react-hot-toast';

interface EmailTemplate {
  _id?: string;
  name: string;
  slug: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
  category: 'transactional' | 'marketing' | 'notification';
  isActive: boolean;
  description?: string;
  previewData?: Record<string, any>;
}

const categoryIcons = {
  transactional: <FileText className="w-4 h-4" />,
  marketing: <ShoppingBag className="w-4 h-4" />,
  notification: <Bell className="w-4 h-4" />
};

const categoryColors = {
  transactional: 'bg-blue-900/30 text-blue-400 border-blue-800',
  marketing: 'bg-green-900/30 text-green-400 border-green-800',
  notification: 'bg-purple-900/30 text-purple-400 border-purple-800'
};

export default function EmailTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showHTMLCode, setShowHTMLCode] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate>({
    name: '',
    slug: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    variables: [],
    category: 'transactional',
    isActive: true,
    description: '',
    previewData: {}
  });

  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => adminService.getEmailTemplates()
  });

  // Debug log
  useEffect(() => {
    console.log('Email Templates Debug:', { templates, isLoading, error });
  }, [templates, isLoading, error]);

  // Initialize default templates
  const initializeMutation = useMutation({
    mutationFn: () => adminService.initializeEmailTemplates(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Templates padrão inicializados');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao inicializar templates');
    }
  });

  // Upsert template
  const upsertMutation = useMutation({
    mutationFn: (template: EmailTemplate) => 
      template._id 
        ? adminService.updateEmailTemplate(template._id, template)
        : adminService.createEmailTemplate(template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template salvo com sucesso');
      setShowEditor(false);
      resetEditor();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar template');
    }
  });

  // Delete template
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteEmailTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template removido com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover template');
    }
  });

  // Send test email
  const handleSendTest = async () => {
    if (!selectedTemplate?._id || !testEmail) {
      toast.error('Selecione um template e digite um email');
      return;
    }

    setIsSending(true);
    try {
      await adminService.sendTestEmailTemplate(selectedTemplate._id, {
        testEmail,
        previewData: selectedTemplate.previewData
      });
      toast.success('Email de teste enviado!');
      setTestEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar email');
    } finally {
      setIsSending(false);
    }
  };

  const resetEditor = () => {
    setEditingTemplate({
      name: '',
      slug: '',
      subject: '',
      htmlContent: '',
      textContent: '',
      variables: [],
      category: 'transactional',
      isActive: true,
      description: '',
      previewData: {}
    });
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleSave = () => {
    if (!editingTemplate.name || !editingTemplate.slug || !editingTemplate.subject || !editingTemplate.htmlContent) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    upsertMutation.mutate(editingTemplate);
  };

  const extractVariables = (content: string) => {
    const regex = /\{\{(\s*[\w]+\s*)\}\}/g;
    const matches = content.matchAll(regex);
    const vars = new Set<string>();
    
    for (const match of matches) {
      vars.add(match[1].trim());
    }
    
    return Array.from(vars);
  };

  const handleContentChange = (content: string) => {
    const vars = extractVariables(content + ' ' + editingTemplate.subject);
    setEditingTemplate({
      ...editingTemplate,
      htmlContent: content,
      variables: vars
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const renderPreview = (template: EmailTemplate) => {
    let content = template.htmlContent;
    const data = template.previewData || {};
    
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      content = content.replace(regex, data[key] || '');
    });
    
    return content;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Erro ao carregar templates</h2>
          <p className="text-slate-400">{(error as any)?.message || 'Erro desconhecido'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Templates de Email</h1>
          <p className="text-slate-400 mt-1">Gerencie os templates de email do sistema</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {initializeMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {templates && templates.length > 0 ? 'Resetar Templates' : 'Inicializar Templates Padrão'}
          </button>
          <button
            onClick={() => {
              resetEditor();
              setShowEditor(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Template
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {templates?.map((template: EmailTemplate) => (
          <div
            key={template._id}
            className="bg-slate-900 rounded-lg border border-slate-800 hover:border-coral/50 transition-all cursor-pointer"
            onClick={() => setSelectedTemplate(template)}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${categoryColors[template.category]}`}>
                    {categoryIcons[template.category]}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{template.name}</h3>
                    <p className="text-slate-500 text-xs">{template.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {template.isActive ? (
                    <span className="w-2 h-2 bg-green-400 rounded-full" title="Ativo" />
                  ) : (
                    <span className="w-2 h-2 bg-slate-400 rounded-full" title="Inativo" />
                  )}
                </div>
              </div>

              <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                {template.description || 'Sem descrição'}
              </p>

              <div className="mb-4">
                <p className="text-slate-500 text-xs mb-2">Assunto:</p>
                <p className="text-white text-sm font-mono bg-slate-800 p-2 rounded">
                  {template.subject}
                </p>
              </div>

              {template.variables && template.variables.length > 0 && (
                <div className="mb-4">
                  <p className="text-slate-500 text-xs mb-2">Variáveis:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map(variable => (
                      <span
                        key={variable}
                        className="px-2 py-1 bg-slate-800 text-coral text-xs rounded font-mono"
                      >
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(template);
                  }}
                  className="flex-1 py-2 px-3 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-3 h-3" />
                  Editar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTemplate(template);
                    setShowPreview(true);
                  }}
                  className="flex-1 py-2 px-3 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Tem certeza que deseja remover este template?')) {
                      deleteMutation.mutate(template._id!);
                    }
                  }}
                  className="p-2 bg-slate-800 text-red-400 rounded hover:bg-slate-700 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Template Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Editor Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {editingTemplate._id ? 'Editar Template' : 'Novo Template'}
              </h2>
              <button
                onClick={() => {
                  setShowEditor(false);
                  resetEditor();
                }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Nome *
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.name}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        placeholder="Ex: Email de Boas Vindas"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Slug *
                      </label>
                      <input
                        type="text"
                        value={editingTemplate.slug}
                        onChange={(e) => setEditingTemplate({ 
                          ...editingTemplate, 
                          slug: e.target.value.toLowerCase().replace(/\s+/g, '-')
                        })}
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                        placeholder="ex: welcome-email"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Categoria
                      </label>
                      <select
                        value={editingTemplate.category}
                        onChange={(e) => setEditingTemplate({ 
                          ...editingTemplate, 
                          category: e.target.value as any 
                        })}
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="transactional">Transacional</option>
                        <option value="marketing">Marketing</option>
                        <option value="notification">Notificação</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Status
                      </label>
                      <select
                        value={editingTemplate.isActive ? 'active' : 'inactive'}
                        onChange={(e) => setEditingTemplate({ 
                          ...editingTemplate, 
                          isActive: e.target.value === 'active' 
                        })}
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Assunto *
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.subject}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      placeholder="Ex: Bem-vindo ao {{siteName}}!"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Descrição
                    </label>
                    <textarea
                      value={editingTemplate.description}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                      rows={2}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      placeholder="Descreva quando este email é enviado..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-300">
                        Conteúdo HTML *
                      </label>
                      <button
                        onClick={() => setShowHTMLCode(!showHTMLCode)}
                        className="text-xs text-coral hover:text-coral-dark flex items-center gap-1"
                      >
                        <Code className="w-3 h-3" />
                        {showHTMLCode ? 'Preview' : 'Código'}
                      </button>
                    </div>
                    
                    {showHTMLCode ? (
                      <textarea
                        value={editingTemplate.htmlContent}
                        onChange={(e) => handleContentChange(e.target.value)}
                        rows={15}
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm"
                        placeholder="<html>...</html>"
                      />
                    ) : (
                      <div className="bg-white rounded-lg p-4 h-96 overflow-auto">
                        <div dangerouslySetInnerHTML={{ __html: renderPreview(editingTemplate) }} />
                      </div>
                    )}
                  </div>

                  {editingTemplate.variables && editingTemplate.variables.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Variáveis Detectadas
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {editingTemplate.variables.map(variable => (
                          <div
                            key={variable}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg"
                          >
                            <span className="text-coral font-mono text-sm">{`{{${variable}}}`}</span>
                            <button
                              onClick={() => copyToClipboard(`{{${variable}}}`)}
                              className="text-slate-400 hover:text-white"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Preview Data */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Dados de Preview (JSON)
                    </label>
                    <textarea
                      value={JSON.stringify(editingTemplate.previewData || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const data = JSON.parse(e.target.value);
                          setEditingTemplate({ ...editingTemplate, previewData: data });
                        } catch {
                          // Invalid JSON, ignore
                        }
                      }}
                      rows={10}
                      className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm"
                      placeholder='{&#10;  "userName": "João Silva",&#10;  "siteName": "Tatame"&#10;}'
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Defina valores para as variáveis usadas no template
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Preview Renderizado
                    </label>
                    <div className="bg-white rounded-lg p-4 h-96 overflow-auto">
                      <div dangerouslySetInnerHTML={{ __html: renderPreview(editingTemplate) }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Editor Footer */}
            <div className="p-6 border-t border-slate-800 flex gap-3">
              <button
                onClick={() => {
                  setShowEditor(false);
                  resetEditor();
                }}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={upsertMutation.isPending}
                className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {upsertMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">{selectedTemplate.name}</h2>
                <p className="text-slate-400 text-sm mt-1">Preview do Template</p>
              </div>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setSelectedTemplate(null);
                }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assunto
                </label>
                <div className="p-3 bg-slate-800 rounded-lg text-white font-mono">
                  {selectedTemplate.subject}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Preview HTML
                </label>
                <div className="bg-white rounded-lg p-4">
                  <div dangerouslySetInnerHTML={{ __html: renderPreview(selectedTemplate) }} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Enviar Email de Teste
                </label>
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Digite o email para teste"
                    className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                  <button
                    onClick={handleSendTest}
                    disabled={isSending}
                    className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Enviar Teste
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}