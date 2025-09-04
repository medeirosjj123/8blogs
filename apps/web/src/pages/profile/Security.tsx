import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeft, Shield, Lock, Eye, EyeOff, Key, 
  Smartphone, AlertTriangle, Check, X, Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';

export const Security: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return await api.put('/api/auth/change-password', data);
    },
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao alterar senha';
      toast.error(message);
    }
  });

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <Link
              to="/perfil"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Segurança</h1>
              <p className="text-gray-600">Gerencie sua senha e configurações de segurança</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Change Password Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-coral/10 rounded-lg">
                <Lock className="w-5 h-5 text-coral" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Alterar Senha</h2>
                <p className="text-sm text-gray-600">Mantenha sua conta segura com uma senha forte</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha Atual
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral pr-10"
                    placeholder="Digite sua senha atual"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral pr-10"
                    placeholder="Digite sua nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-coral pr-10"
                    placeholder="Confirme sua nova senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleChangePassword}
                  disabled={changePasswordMutation.isPending}
                  className="px-6 py-2 bg-coral text-white rounded-xl hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Alterar Senha
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Account Security Info */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Informações da Conta</h2>
                <p className="text-sm text-gray-600">Status de segurança da sua conta</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-green-100 rounded-full">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-green-900">E-mail verificado</h3>
                    <p className="text-sm text-green-700">{user?.email}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-yellow-100 rounded-full">
                    <Key className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-yellow-900">Autenticação de dois fatores</h3>
                    <p className="text-sm text-yellow-700">Adicione uma camada extra de segurança à sua conta</p>
                  </div>
                  <button className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors">
                    Em breve
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Security Tips */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Dicas de Segurança</h2>
                <p className="text-sm text-gray-600">Mantenha sua conta protegida</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <ul className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-coral rounded-full mt-2 flex-shrink-0"></div>
                  Use uma senha forte com pelo menos 8 caracteres
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-coral rounded-full mt-2 flex-shrink-0"></div>
                  Inclua letras maiúsculas, minúsculas, números e símbolos
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-coral rounded-full mt-2 flex-shrink-0"></div>
                  Não compartilhe sua senha com ninguém
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-coral rounded-full mt-2 flex-shrink-0"></div>
                  Altere sua senha regularmente
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};