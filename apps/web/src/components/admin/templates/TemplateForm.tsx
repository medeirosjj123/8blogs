import React, { useState, useRef } from 'react';
import { X, Upload, Image, File, Info, Trash2 } from 'lucide-react';
import { adminService } from '../../../services/admin.service';
import toast from 'react-hot-toast';

interface TemplateFormProps {
  template?: any;
  onClose: () => void;
  onSave: () => void;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({ template, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    category: template?.category || 'blog',
    version: template?.version || '1.0.0',
    seoScore: template?.seoScore || 85,
    performanceScore: template?.performanceScore || 85,
    difficulty: template?.difficulty || 'beginner',
    wordpressVersion: template?.wordpressVersion || '6.4',
    phpVersion: template?.phpVersion || '8.1',
    pricingTier: template?.pricingTier || 'free',
    status: template?.status || 'draft',
    demoUrl: template?.demoUrl || '',
    features: template?.features?.join(', ') || '',
    requiredPlugins: template?.requiredPlugins?.join(', ') || ''
  });

  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileName = file.name.toLowerCase();
      
      // Validate file extension
      if (!fileName.endsWith('.wpress') && !fileName.endsWith('.wordpress') && 
          !fileName.endsWith('.tar.gz') && !fileName.endsWith('.zip')) {
        toast.error('Arquivo inválido! Por favor selecione um arquivo .wpress, .wordpress, .tar.gz ou .zip');
        e.target.value = ''; // Clear the input
        return;
      }
      
      setTemplateFile(file);
      toast.success(`Template selecionado: ${file.name}`);
    }
  };

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileName = file.name.toLowerCase();
      
      // Validate image file
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecione uma imagem válida');
        e.target.value = ''; // Clear the input
        return;
      }
      
      setThumbnailFile(file);
      toast.success(`Imagem selecionada: ${file.name}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!template && !templateFile) {
      toast.error('📦 Por favor, selecione um arquivo de template (.wpress)');
      return;
    }
    
    // Extra validation for new templates
    if (!template && templateFile) {
      const fileName = templateFile.name.toLowerCase();
      if (!fileName.endsWith('.wpress') && !fileName.endsWith('.wordpress') && 
          !fileName.endsWith('.tar.gz') && !fileName.endsWith('.zip')) {
        toast.error('⚠️ Arquivo inválido! O template deve ser um arquivo .wpress, .wordpress, .tar.gz ou .zip');
        toast.error(`Você selecionou: ${templateFile.name}`);
        return;
      }
    }

    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      
      // Add all text fields
      Object.keys(formData).forEach(key => {
        if (key === 'features' || key === 'requiredPlugins') {
          const value = formData[key as keyof typeof formData];
          if (value) {
            const items = value.split(',').map((item: string) => item.trim()).filter(Boolean);
            formDataToSend.append(key, JSON.stringify(items));
          }
        } else {
          formDataToSend.append(key, formData[key as keyof typeof formData]);
        }
      });

      // Add files if present
      if (templateFile) {
        formDataToSend.append('template', templateFile);
      }
      if (thumbnailFile) {
        formDataToSend.append('thumbnail', thumbnailFile);
      }

      if (template) {
        await adminService.updateTemplate(template._id, formDataToSend);
        toast.success('Template atualizado com sucesso');
      } else {
        await adminService.createTemplate(formDataToSend);
        toast.success('Template criado com sucesso');
      }

      onSave();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(template ? 'Erro ao atualizar template' : 'Erro ao criar template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-800 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-white">
            {template ? 'Editar Template' : 'Novo Template'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Informações Básicas</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome do Template *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Ex: Blog Profissional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descrição *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Descreva o template e suas principais características"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Categoria *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  >
                    <option value="blog">Blog</option>
                    <option value="affiliate">Afiliados</option>
                    <option value="business">Negócios</option>
                    <option value="ecommerce">E-commerce</option>
                    <option value="portfolio">Portfolio</option>
                    <option value="landing">Landing Page</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Versão
                  </label>
                  <input
                    type="text"
                    name="version"
                    value={formData.version}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-coral"
                    placeholder="1.0.0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  URL de Demonstração
                </label>
                <input
                  type="url"
                  name="demoUrl"
                  value={formData.demoUrl}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="https://demo.exemplo.com"
                />
              </div>
            </div>

            {/* Files */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Arquivos</h3>
              
              <div className="border border-coral/50 bg-coral/5 rounded-lg p-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  📦 Arquivo do Template WordPress (.wpress, .tar.gz, .zip) {!template && '*'}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    ref={templateInputRef}
                    type="file"
                    onChange={handleTemplateFileChange}
                    accept=".wpress,.wordpress,.tar.gz,.zip"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => templateInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Selecionar Arquivo
                  </button>
                  {templateFile && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 text-sm text-green-400 bg-green-900/20 px-3 py-1 rounded-lg">
                        <File className="w-4 h-4" />
                        <span className="font-medium">{templateFile.name}</span>
                        <span className="text-xs text-green-300">({(templateFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTemplateFile(null);
                          if (templateInputRef.current) templateInputRef.current.value = '';
                          toast.info('Arquivo de template removido');
                        }}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {template && !templateFile && (
                    <div className="text-sm text-slate-400">
                      Arquivo atual mantido
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  <Info className="w-3 h-3 inline mr-1" />
                  Tamanho máximo: 1GB. Formatos aceitos: .wpress (Duplicator), .tar.gz, .zip
                </p>
              </div>

              <div className="border border-blue-500/50 bg-blue-500/5 rounded-lg p-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  🖼️ Imagem de Capa (JPG, PNG, etc)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    onChange={handleThumbnailFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <Image className="w-4 h-4" />
                    Selecionar Imagem
                  </button>
                  {thumbnailFile && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 text-sm text-blue-400 bg-blue-900/20 px-3 py-1 rounded-lg">
                        <Image className="w-4 h-4" />
                        <span className="font-medium">{thumbnailFile.name}</span>
                        <span className="text-xs text-blue-300">({(thumbnailFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setThumbnailFile(null);
                          if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
                          toast.info('Imagem removida');
                        }}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {template?.thumbnailUrl && !thumbnailFile && (
                    <div className="text-sm text-slate-400">
                      Imagem atual mantida
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Detalhes Técnicos</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Score SEO (0-100)
                  </label>
                  <input
                    type="number"
                    name="seoScore"
                    value={formData.seoScore}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Score Performance (0-100)
                  </label>
                  <input
                    type="number"
                    name="performanceScore"
                    value={formData.performanceScore}
                    onChange={handleInputChange}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-coral"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Dificuldade
                  </label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  >
                    <option value="beginner">Iniciante</option>
                    <option value="intermediate">Intermediário</option>
                    <option value="advanced">Avançado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Versão WordPress
                  </label>
                  <input
                    type="text"
                    name="wordpressVersion"
                    value={formData.wordpressVersion}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-coral"
                    placeholder="6.4"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Versão PHP
                  </label>
                  <select
                    name="phpVersion"
                    value={formData.phpVersion}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  >
                    <option value="7.4">PHP 7.4</option>
                    <option value="8.0">PHP 8.0</option>
                    <option value="8.1">PHP 8.1</option>
                    <option value="8.2">PHP 8.2</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Preço
                  </label>
                  <select
                    name="pricingTier"
                    value={formData.pricingTier}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  >
                    <option value="free">Gratuito</option>
                    <option value="pro">Pro</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Features (separadas por vírgula)
                </label>
                <input
                  type="text"
                  name="features"
                  value={formData.features}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="SEO Otimizado, Cache Integrado, Schema Markup"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Plugins Necessários (separados por vírgula)
                </label>
                <input
                  type="text"
                  name="requiredPlugins"
                  value={formData.requiredPlugins}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Yoast SEO, WP Rocket, Contact Form 7"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                >
                  <option value="draft">Rascunho</option>
                  <option value="active">Ativo</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-coral hover:bg-coral-dark text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : template ? 'Atualizar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
};