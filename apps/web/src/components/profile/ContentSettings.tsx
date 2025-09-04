import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Image,
  Save,
  Loader2,
  TestTube,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface ContentSettings {
  pexels: {
    apiKey?: string;
    isActive: boolean;
  };
}

export default function ContentSettings() {
  const [showPexelsKey, setShowPexelsKey] = useState(false);
  const [testingPexels, setTestingPexels] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch content settings
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['content-settings'],
    queryFn: async () => {
      console.log('Fetching content settings...');
      try {
        const response = await api.get('/api/content-settings');
        console.log('Content settings response:', response.data);
        return response.data.data;
      } catch (err) {
        console.error('Error fetching content settings:', err);
        throw err;
      }
    }
  });

  const [formData, setFormData] = useState<ContentSettings>(settings || {
    pexels: {
      apiKey: '',
      isActive: false
    }
  });

  // Update form when settings load
  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ContentSettings) => {
      const response = await api.put('/api/content-settings', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-settings'] });
      toast.success('Configurações salvas com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar configurações');
    }
  });

  // Test Pexels connection
  const testPexelsConnection = async () => {
    setTestingPexels(true);
    try {
      const response = await api.post('/api/content-settings/pexels/test', { 
        apiKey: formData.pexels.apiKey?.startsWith('***') ? undefined : formData.pexels.apiKey 
      });
      
      const result = response.data;
      if (result.success) {
        toast.success('API Pexels conectada com sucesso');
      } else {
        toast.error(result.message || 'Falha no teste da API Pexels');
      }
    } catch (error) {
      toast.error('Erro ao testar conexão com Pexels');
    } finally {
      setTestingPexels(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pexels API Settings */}
      <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Image className="w-5 h-5 text-coral" />
              Configuração da API Pexels
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Configure o Pexels para busca automática de imagens na geração de conteúdo
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Chave da API
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPexelsKey ? 'text' : 'password'}
                  value={formData.pexels.apiKey || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    pexels: { ...formData.pexels, apiKey: e.target.value }
                  })}
                  className="w-full p-3 pr-12 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Sua chave de API do Pexels"
                />
                <button
                  type="button"
                  onClick={() => setShowPexelsKey(!showPexelsKey)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  {showPexelsKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                onClick={testPexelsConnection}
                disabled={testingPexels || !formData.pexels.apiKey}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {testingPexels ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                Testar
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Obtenha sua chave gratuita em <a href="https://www.pexels.com/api/" target="_blank" className="text-coral hover:underline">pexels.com/api</a>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.pexels.isActive}
                onChange={(e) => setFormData({
                  ...formData,
                  pexels: { ...formData.pexels, isActive: e.target.checked }
                })}
                className="w-4 h-4 text-coral bg-slate-800 border-slate-700 rounded focus:ring-coral"
              />
              <span className="text-sm text-slate-300">Ativar inserção automática de imagens no conteúdo gerado</span>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={() => saveMutation.mutate(formData)}
          disabled={saveMutation.isPending}
          className="px-6 py-3 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Salvar Chave API
        </button>
      </div>
    </div>
  );
}