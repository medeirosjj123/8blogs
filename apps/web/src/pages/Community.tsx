import React from 'react';
import { MessageCircle, Rocket, ArrowLeft, Hash, Users, Bell, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Community: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-500/20">
              <MessageCircle className="w-16 h-16 text-blue-600 opacity-80" />
            </div>
            <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <Rocket className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Title & Description */}
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Comunidade - Em Breve!
          </h1>
          <p className="text-xl text-slate-600 mb-6 max-w-2xl mx-auto">
            Estamos criando o melhor espaço de chat e colaboração para a comunidade Tatame
          </p>

          {/* Features Preview */}
          <div className="bg-white rounded-2xl shadow-soft p-8 mb-8 border border-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900 mb-6">
              O que você encontrará:
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Hash className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900 mb-1">Canais Organizados</h3>
                  <p className="text-sm text-slate-600">Discussões separadas por temas: SEO, WordPress, Dúvidas</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900 mb-1">Chat em Tempo Real</h3>
                  <p className="text-sm text-slate-600">Mensagens instantâneas com toda a comunidade</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900 mb-1">Mensagens Diretas</h3>
                  <p className="text-sm text-slate-600">Conversas privadas entre membros</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900 mb-1">Notificações Inteligentes</h3>
                  <p className="text-sm text-slate-600">Seja notificado apenas do que importa para você</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900 mb-1">Respostas Rápidas</h3>
                  <p className="text-sm text-slate-600">Reações com emoji e replies organizadas</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-slate-900 mb-1">Compartilhamento</h3>
                  <p className="text-sm text-slate-600">Envie imagens, links e arquivos facilmente</p>
                </div>
              </div>
            </div>
          </div>

          {/* Community Preview */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-8 border border-blue-200">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Comunidade Ativa
              </h3>
            </div>
            <p className="text-slate-600 mb-4">
              Um espaço colaborativo onde membros podem tirar dúvidas, compartilhar experiências e crescer juntos no mundo do SEO.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="bg-white/80 rounded-lg p-3">
                <div className="font-bold text-blue-600">#seo-geral</div>
                <div className="text-xs text-slate-600">Discussões gerais</div>
              </div>
              <div className="bg-white/80 rounded-lg p-3">
                <div className="font-bold text-green-600">#wordpress</div>
                <div className="text-xs text-slate-600">Dicas técnicas</div>
              </div>
              <div className="bg-white/80 rounded-lg p-3">
                <div className="font-bold text-purple-600">#duvidas</div>
                <div className="text-xs text-slate-600">Tire suas dúvidas</div>
              </div>
            </div>
          </div>

          {/* Launch Timeline */}
          <div className="bg-gradient-to-r from-purple-500/5 to-purple-600/10 rounded-2xl p-6 border border-purple-500/20">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <Rocket className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Lançamento Previsto
              </h3>
            </div>
            <p className="text-slate-600 mb-4">
              Nossa equipe está finalizando os últimos detalhes para criar uma experiência de chat incrível. A comunidade estará online muito em breve!
            </p>
            <div className="text-sm text-purple-600 font-medium">
              🚧 Últimos ajustes em andamento
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button
              onClick={() => navigate('/cursos')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg"
            >
              <MessageCircle className="w-4 h-4" />
              Ver Cursos Enquanto Isso
            </button>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-3 rounded-xl font-semibold transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Dashboard
            </button>
          </div>

          {/* Fun element */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 px-4 py-2 rounded-full text-sm font-medium">
              💬 Em breve você poderá conversar com toda a comunidade!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};