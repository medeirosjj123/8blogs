import React from 'react';
import { Users, Rocket, ArrowLeft, Search, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Discover: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="mb-8 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Início
        </button>

        {/* Coming Soon Content */}
        <div className="text-center">
          {/* Icon */}
          <div className="relative mb-8">
            <div className="w-32 h-32 bg-gradient-to-br from-coral/10 to-coral/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-coral/20">
              <Users className="w-16 h-16 text-coral opacity-80" />
            </div>
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
              <Rocket className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Title & Description */}
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Descobrir - Em Breve!
          </h1>
          <p className="text-xl text-slate-600 mb-6 max-w-2xl mx-auto">
            Estamos preparando algo incrível para você conectar e descobrir outros membros da comunidade
          </p>

          {/* Features Preview */}
          <div className="bg-white rounded-2xl shadow-soft p-8 mb-8 border border-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">
              O que você poderá fazer:
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900 mb-1">Buscar Membros</h3>
                  <p className="text-sm text-slate-600">Encontre pessoas com interesses similares aos seus</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900 mb-1">Fazer Conexões</h3>
                  <p className="text-sm text-slate-600">Conecte-se com outros profissionais de SEO</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900 mb-1">Formar Grupos</h3>
                  <p className="text-sm text-slate-600">Crie grupos de estudo e colaboração</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900 mb-1">Compartilhar Projetos</h3>
                  <p className="text-sm text-slate-600">Mostre seus trabalhos e receba feedback</p>
                </div>
              </div>
            </div>
          </div>

          {/* Launch Timeline */}
          <div className="bg-gradient-to-r from-coral/5 to-coral/10 rounded-2xl p-6 border border-coral/20">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-8 bg-coral rounded-full flex items-center justify-center">
                <Rocket className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Lançamento Previsto
              </h3>
            </div>
            <p className="text-slate-600 mb-4">
              Esta funcionalidade estará disponível em breve. Estamos trabalhando para criar a melhor experiência de networking para você!
            </p>
            <div className="text-sm text-coral font-medium">
              🚧 Em desenvolvimento ativo
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button
              onClick={() => navigate('/comunidade')}
              className="inline-flex items-center gap-2 bg-coral hover:bg-coral-dark text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg"
            >
              <Users className="w-4 h-4" />
              Ir para Comunidade
            </button>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-semibold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};