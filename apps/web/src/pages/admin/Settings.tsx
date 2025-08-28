import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Key,
  Send,
  Save,
  AlertCircle,
  CheckCircle,
  Shield,
  Globe,
  Loader2,
  Eye,
  EyeOff,
  TestTube,
  Webhook,
  Search,
  Settings as SettingsIcon
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import toast from 'react-hot-toast';
import WebhookSettings from '../../components/admin/webhooks/WebhookSettings';
import SeoSettings from '../../components/admin/seo/SeoSettings';
import EnvSettings from '../../components/admin/env/EnvSettings';

interface EmailSettings {
  provider: string;
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
}

interface GeneralSettings {
  siteName: string;
  siteUrl: string;
  supportEmail: string;
  maintenanceMode: boolean;
}

interface SecuritySettings {
  twoFactorRequired: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
}

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState<'email' | 'general' | 'security' | 'webhooks' | 'seo' | 'env'>('email');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  
  const queryClient = useQueryClient();

  // Email settings state
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    provider: 'elasticemail',
    apiKey: '',
    fromEmail: '',
    fromName: 'Tatame',
    replyToEmail: ''
  });

  // General settings state
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    siteName: 'Tatame',
    siteUrl: '',
    supportEmail: '',
    maintenanceMode: false
  });

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorRequired: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 6,
    passwordRequireUppercase: false,
    passwordRequireNumbers: false,
    passwordRequireSymbols: false
  });

  // Fetch all settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminService.getSettings()
  });

  // Update settings when data is fetched
  useEffect(() => {
    if (settingsData) {
      if (settingsData.email) {
        setEmailSettings({
          provider: settingsData.email.provider?.value || 'elasticemail',
          apiKey: settingsData.email.apiKey?.value || '',
          fromEmail: settingsData.email.fromEmail?.value || '',
          fromName: settingsData.email.fromName?.value || 'Tatame',
          replyToEmail: settingsData.email.replyToEmail?.value || ''
        });
      }
      
      if (settingsData.general) {
        setGeneralSettings({
          siteName: settingsData.general.siteName?.value || 'Tatame',
          siteUrl: settingsData.general.siteUrl?.value || '',
          supportEmail: settingsData.general.supportEmail?.value || '',
          maintenanceMode: settingsData.general.maintenanceMode?.value || false
        });
      }
      
      if (settingsData.security) {
        setSecuritySettings({
          twoFactorRequired: settingsData.security.twoFactorRequired?.value || false,
          sessionTimeout: settingsData.security.sessionTimeout?.value || 30,
          maxLoginAttempts: settingsData.security.maxLoginAttempts?.value || 5,
          passwordMinLength: settingsData.security.passwordMinLength?.value || 6,
          passwordRequireUppercase: settingsData.security.passwordRequireUppercase?.value || false,
          passwordRequireNumbers: settingsData.security.passwordRequireNumbers?.value || false,
          passwordRequireSymbols: settingsData.security.passwordRequireSymbols?.value || false
        });
      }
    }
  }, [settingsData]);

  // Update email settings mutation
  const updateEmailMutation = useMutation({
    mutationFn: (settings: EmailSettings) => adminService.updateEmailSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Configurações de email atualizadas');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar configurações');
    }
  });

  // Update general settings mutation
  const updateGeneralMutation = useMutation({
    mutationFn: (settings: GeneralSettings) => adminService.updateGeneralSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Configurações gerais atualizadas');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar configurações');
    }
  });

  // Update security settings mutation
  const updateSecurityMutation = useMutation({
    mutationFn: (settings: SecuritySettings) => adminService.updateSecuritySettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      toast.success('Configurações de segurança atualizadas');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar configurações');
    }
  });

  // Test email configuration
  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Digite um email para teste');
      return;
    }

    setIsTesting(true);
    try {
      const result = await adminService.testEmailConfiguration(testEmail);
      if (result.success) {
        toast.success('Email de teste enviado com sucesso!');
        setTestEmail('');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar email de teste');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveEmailSettings = () => {
    if (!emailSettings.provider || !emailSettings.apiKey || !emailSettings.fromEmail) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    updateEmailMutation.mutate(emailSettings);
  };

  const handleSaveGeneralSettings = () => {
    updateGeneralMutation.mutate(generalSettings);
  };

  const handleSaveSecuritySettings = () => {
    updateSecurityMutation.mutate(securitySettings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-slate-400 mt-1">Gerencie as configurações do sistema</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('email')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'email'
                ? 'border-coral text-coral'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4 inline mr-2" />
            Email
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'general'
                ? 'border-coral text-coral'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4 inline mr-2" />
            Geral
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'security'
                ? 'border-coral text-coral'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Segurança
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'webhooks'
                ? 'border-coral text-coral'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Webhook className="w-4 h-4 inline mr-2" />
            Webhooks
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'seo'
                ? 'border-coral text-coral'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4 inline mr-2" />
            SEO
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'env'
                ? 'border-coral text-coral'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <SettingsIcon className="w-4 h-4 inline mr-2" />
            Variáveis
          </button>
        </nav>
      </div>

      {/* Email Settings */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
            <h2 className="text-lg font-semibold text-white mb-4">Configurações de Email</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Provedor de Email *
                </label>
                <select
                  value={emailSettings.provider}
                  onChange={(e) => setEmailSettings({ ...emailSettings, provider: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                >
                  <option value="elasticemail">ElasticEmail</option>
                  <option value="brevo">Brevo (SendinBlue)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API Key *
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={emailSettings.apiKey}
                    onChange={(e) => setEmailSettings({ ...emailSettings, apiKey: e.target.value })}
                    className="w-full p-3 pr-12 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                    placeholder="Sua API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {emailSettings.provider === 'elasticemail' 
                    ? 'Obtenha sua API key em elasticemail.com/account#/settings/new/manage-api'
                    : 'Obtenha sua API key em app.brevo.com/settings/keys/api'
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email Remetente *
                  </label>
                  <input
                    type="email"
                    value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                    placeholder="noreply@seudominio.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nome Remetente
                  </label>
                  <input
                    type="text"
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                    placeholder="Tatame"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email para Resposta (opcional)
                </label>
                <input
                  type="email"
                  value={emailSettings.replyToEmail}
                  onChange={(e) => setEmailSettings({ ...emailSettings, replyToEmail: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="suporte@seudominio.com"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveEmailSettings}
                  disabled={updateEmailMutation.isPending}
                  className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {updateEmailMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar Configurações
                </button>
              </div>
            </div>
          </div>

          {/* Test Email */}
          <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
            <h3 className="text-lg font-semibold text-white mb-4">Testar Configuração</h3>
            
            <div className="flex gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Digite um email para teste"
                className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
              />
              <button
                onClick={handleTestEmail}
                disabled={isTesting || !emailSettings.apiKey}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                Enviar Email de Teste
              </button>
            </div>
            
            {!emailSettings.apiKey && (
              <p className="text-yellow-400 text-sm mt-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Configure e salve as credenciais antes de testar
              </p>
            )}
          </div>
        </div>
      )}

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-4">Configurações Gerais</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome do Site
                </label>
                <input
                  type="text"
                  value={generalSettings.siteName}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  URL do Site
                </label>
                <input
                  type="url"
                  value={generalSettings.siteUrl}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, siteUrl: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="https://tatame.afiliadofaixapreta.com.br"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email de Suporte
              </label>
              <input
                type="email"
                value={generalSettings.supportEmail}
                onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                placeholder="suporte@tatame.com.br"
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={generalSettings.maintenanceMode}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, maintenanceMode: e.target.checked })}
                  className="w-4 h-4 text-coral bg-slate-800 border-slate-700 rounded focus:ring-coral"
                />
                <span className="text-sm text-slate-300">Modo de Manutenção</span>
              </label>
              <p className="text-xs text-slate-500 mt-1 ml-6">
                Quando ativado, apenas administradores podem acessar o sistema
              </p>
            </div>

            <button
              onClick={handleSaveGeneralSettings}
              disabled={updateGeneralMutation.isPending}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {updateGeneralMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Configurações
            </button>
          </div>
        </div>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-4">Configurações de Segurança</h2>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={securitySettings.twoFactorRequired}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorRequired: e.target.checked })}
                  className="w-4 h-4 text-coral bg-slate-800 border-slate-700 rounded focus:ring-coral"
                />
                <span className="text-sm text-slate-300">Exigir 2FA para todos os usuários</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Timeout da Sessão (minutos)
                </label>
                <input
                  type="number"
                  value={securitySettings.sessionTimeout}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  min="5"
                  max="1440"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tentativas de Login Máximas
                </label>
                <input
                  type="number"
                  value={securitySettings.maxLoginAttempts}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  min="3"
                  max="10"
                />
              </div>
            </div>

            <div>
              <h3 className="text-md font-medium text-white mb-3">Requisitos de Senha</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Comprimento Mínimo
                  </label>
                  <input
                    type="number"
                    value={securitySettings.passwordMinLength}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: parseInt(e.target.value) })}
                    className="w-full md:w-32 p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                    min="6"
                    max="32"
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={securitySettings.passwordRequireUppercase}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, passwordRequireUppercase: e.target.checked })}
                    className="w-4 h-4 text-coral bg-slate-800 border-slate-700 rounded focus:ring-coral"
                  />
                  <span className="text-sm text-slate-300">Exigir letras maiúsculas</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={securitySettings.passwordRequireNumbers}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, passwordRequireNumbers: e.target.checked })}
                    className="w-4 h-4 text-coral bg-slate-800 border-slate-700 rounded focus:ring-coral"
                  />
                  <span className="text-sm text-slate-300">Exigir números</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={securitySettings.passwordRequireSymbols}
                    onChange={(e) => setSecuritySettings({ ...securitySettings, passwordRequireSymbols: e.target.checked })}
                    className="w-4 h-4 text-coral bg-slate-800 border-slate-700 rounded focus:ring-coral"
                  />
                  <span className="text-sm text-slate-300">Exigir símbolos especiais</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleSaveSecuritySettings}
              disabled={updateSecurityMutation.isPending}
              className="px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {updateSecurityMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Configurações
            </button>
          </div>
        </div>
      )}

      {/* Webhook Settings */}
      {activeTab === 'webhooks' && (
        <WebhookSettings />
      )}

      {/* SEO Settings */}
      {activeTab === 'seo' && (
        <SeoSettings />
      )}

      {/* Environment Variables Settings */}
      {activeTab === 'env' && (
        <EnvSettings />
      )}
    </div>
  );
}