import React, { useState } from 'react';
import { Calendar, Clock, Users, Video, Plus, X, CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUsage } from '../hooks/useUsage';
import { useAuth } from '../contexts/AuthContext';
import { useUpcomingCalls, usePastCalls, useRegisterForCall, useUnregisterFromCall } from '../hooks/useCalls';

export const WeeklyCalls: React.FC = () => {
  const { user } = useAuth();
  const { usage } = useUsage();
  const navigate = useNavigate();
  
  // API hooks
  const { data: upcomingCalls, isLoading: loadingUpcoming, error: upcomingError } = useUpcomingCalls();
  const { data: pastCalls, isLoading: loadingPast, error: pastError } = usePastCalls();
  const registerMutation = useRegisterForCall();
  const unregisterMutation = useUnregisterFromCall();

  // Check if user has premium access
  const hasWeeklyCallsAccess = usage?.features?.weeklyCalls || false;

  // Helper functions
  const isUserRegistered = (call: any) => {
    return call.registeredUsers.includes(user?._id);
  };

  const handleRegisterToggle = async (callId: string, isRegistered: boolean) => {
    try {
      if (isRegistered) {
        await unregisterMutation.mutateAsync(callId);
      } else {
        await registerMutation.mutateAsync(callId);
      }
    } catch (error) {
      // Error is handled in the mutation hooks
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!hasWeeklyCallsAccess) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 bloghouse-glow">
            <Video className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-bloghouse-primary-600 to-bloghouse-secondary-600 bg-clip-text text-transparent mb-4">
            Chamadas Semanais Premium
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Participe de sessões exclusivas de mentoria em grupo, tire dúvidas diretamente e networking com outros blogueiros profissionais.
          </p>
          
          <div className="bg-white rounded-2xl bloghouse-glow p-8 max-w-lg mx-auto mb-8 border border-bloghouse-primary-100">
            <h3 className="text-xl font-bold text-slate-900 mb-4">O que está incluído:</h3>
            <ul className="space-y-3 text-left">
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-slate-700">Chamadas semanais de 60-90 minutos</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-slate-700">Mentoria direta e Q&A</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-slate-700">Networking com outros Premium</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-slate-700">Gravações para assistir depois</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-slate-700">Acesso prioritário para temas</span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => navigate('/precos')}
            className="gradient-primary hover:gradient-secondary text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all duration-200 bloghouse-glow hover:bloghouse-glow-secondary"
          >
            Fazer Upgrade para Black Belt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-bloghouse-primary-600 to-bloghouse-secondary-600 bg-clip-text text-transparent mb-3">
          Chamadas Semanais
        </h1>
        <p className="text-slate-600 mb-4">
          Participe das sessões de mentoria exclusivas para membros Premium
        </p>
        
        <div className="bg-gradient-to-r from-bloghouse-primary-50 to-bloghouse-secondary-50 border border-bloghouse-primary-200 rounded-2xl p-4 gradient-glass">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-bloghouse-primary-600" />
            <div>
              <h3 className="font-semibold text-bloghouse-gray-900">Acesso Premium Ativo</h3>
              <p className="text-sm text-slate-600">
                Você tem acesso completo às chamadas semanais e gravações
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="mb-12">
        <h2 className="text-xl font-bold bg-gradient-to-r from-bloghouse-primary-700 to-bloghouse-secondary-700 bg-clip-text text-transparent mb-6">Próximas Sessões</h2>
        
        {loadingUpcoming ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-slate-600">Carregando chamadas...</span>
          </div>
        ) : upcomingError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600">Erro ao carregar as chamadas próximas</p>
            <p className="text-sm text-red-500 mt-1">Tente recarregar a página</p>
          </div>
        ) : !upcomingCalls || upcomingCalls.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">Nenhuma chamada próxima programada</p>
            <p className="text-sm text-slate-500 mt-1">Novas chamadas serão anunciadas em breve</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingCalls.map((call) => {
              const isRegistered = isUserRegistered(call);
              const isMutating = registerMutation.isPending || unregisterMutation.isPending;
              
              return (
                <div key={call._id} className="bg-white rounded-2xl bloghouse-glow overflow-hidden border border-bloghouse-primary-100">
                  <div className="gradient-primary p-4">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} />
                        <span className="text-sm font-medium">
                          {formatDate(call.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock size={14} />
                        {formatTime(call.date)}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="font-bold text-slate-900 mb-3">{call.title}</h3>
                    
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{call.description}</p>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock size={16} />
                        <span>{call.duration} minutos</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Users size={16} />
                        <span>{call.currentParticipants}/{call.maxParticipants} inscritos</span>
                      </div>
                    </div>

                    {call.topics.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-slate-900 mb-2">Temas:</h4>
                        <div className="flex flex-wrap gap-1">
                          {call.topics.map((topic, index) => (
                            <span key={index} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {isRegistered && call.zoomLink ? (
                      <a
                        href={call.zoomLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 gradient-primary hover:gradient-secondary text-white bloghouse-glow hover:bloghouse-glow-secondary"
                      >
                        <Video size={16} />
                        Ver Link
                      </a>
                    ) : (
                      <button
                        onClick={() => handleRegisterToggle(call._id, isRegistered)}
                        disabled={call.isFull && !isRegistered || isMutating}
                        className={`w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                          isRegistered
                            ? 'bg-gradient-to-r from-bloghouse-primary-50 to-bloghouse-secondary-50 text-bloghouse-primary-600 border border-bloghouse-primary-200 hover:from-bloghouse-primary-100 hover:to-bloghouse-secondary-100'
                            : call.isFull
                            ? 'bg-bloghouse-gray-100 text-bloghouse-gray-400 cursor-not-allowed'
                            : 'gradient-primary hover:gradient-secondary text-white bloghouse-glow hover:bloghouse-glow-secondary disabled:opacity-50'
                        }`}
                      >
                        {isMutating && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        {isRegistered && !call.zoomLink ? 'Registrado - Link em breve' :
                         isRegistered ? 'Registrado' : 
                         call.isFull ? 'Lotado' : 'Inscrever-se'}
                      </button>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Sessions */}
      <div>
        <h2 className="text-xl font-bold bg-gradient-to-r from-bloghouse-primary-700 to-bloghouse-secondary-700 bg-clip-text text-transparent mb-6">Gravações Anteriores</h2>
        
        {loadingPast ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
            <span className="ml-2 text-slate-600">Carregando gravações...</span>
          </div>
        ) : pastError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600">Erro ao carregar as gravações</p>
            <p className="text-sm text-red-500 mt-1">Tente recarregar a página</p>
          </div>
        ) : !pastCalls || pastCalls.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
            <Video className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">Nenhuma gravação disponível ainda</p>
            <p className="text-sm text-slate-500 mt-1">As gravações das chamadas anteriores aparecerão aqui</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastCalls.map((call) => (
              <div key={call._id} className="bg-white rounded-2xl bloghouse-glow overflow-hidden opacity-90 border border-bloghouse-gray-200">
                <div className="bg-gradient-to-r from-bloghouse-gray-700 to-bloghouse-gray-800 p-4">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      <span className="text-sm font-medium">
                        {formatDate(call.date)}
                      </span>
                    </div>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                      Gravação
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="font-bold text-slate-900 mb-3">{call.title}</h3>
                  
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{call.description}</p>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock size={16} />
                      <span>{call.duration} minutos</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users size={16} />
                      <span>{call.attendedUsers.length} participaram</span>
                    </div>
                  </div>

                  {call.topics.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-slate-900 mb-2">Temas abordados:</h4>
                      <div className="flex flex-wrap gap-1">
                        {call.topics.map((topic, index) => (
                          <span key={index} className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {call.recordingLink ? (
                    <a
                      href={call.recordingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-xl font-semibold gradient-secondary hover:gradient-accent text-white bloghouse-glow-secondary hover:bloghouse-glow-accent transition-all flex items-center justify-center gap-2"
                    >
                      <Video size={16} />
                      Assistir Gravação
                    </a>
                  ) : (
                    <div className="w-full py-3 px-4 rounded-xl font-medium bg-bloghouse-gray-100 text-bloghouse-gray-500 flex items-center justify-center gap-2">
                      <Video size={16} />
                      Gravação em processamento
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};