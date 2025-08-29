import React, { useState, useEffect } from 'react';
import { ArrowRight, TrendingUp, Clock, Target, Award, PlayCircle, Trophy, Zap, Sparkles, ChevronRight, Loader2, BookOpen, DollarSign, FileText, Globe } from 'lucide-react';
import { useStats, useActivities, useAchievements } from '../hooks/useStats';
import { useCourses } from '../hooks/useCourses';
import { useAuth } from '../contexts/AuthContext';
import { OnboardingModal } from '../components/OnboardingModal';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: activities, isLoading: activitiesLoading } = useActivities(4);
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user should see onboarding
  useEffect(() => {
    if (user) {
      const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
      // Show onboarding for any user who hasn't completed it (removed 24h restriction for testing)
      
      if (!hasCompletedOnboarding) {
        // Show onboarding after a brief delay
        const timer = setTimeout(() => {
          setShowOnboarding(true);
        }, 1500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const getBeltClass = (belt: string) => {
    switch(belt) {
      case 'branca': return 'bg-gradient-to-r from-gray-100 to-gray-200';
      case 'azul': return 'bg-gradient-to-r from-blue-400 to-blue-500';
      case 'roxa': return 'bg-gradient-to-r from-purple-400 to-purple-500';
      case 'marrom': return 'bg-gradient-to-r from-amber-700 to-amber-800';
      case 'preta': return 'bg-gradient-to-r from-gray-800 to-gray-900';
      default: return 'bg-gradient-to-r from-gray-100 to-gray-200';
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  if (statsLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral mx-auto mb-4" />
          <p className="text-slate-600">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    { 
      label: 'Blogs Ativos', 
      value: '2/3', 
      change: '+1 este mês', 
      icon: <Globe size={18} />, 
      bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      iconColor: 'text-blue-600' 
    },
    { 
      label: 'Reviews Geradas', 
      value: '45/100', 
      change: '+12 esta semana', 
      icon: <FileText size={18} />, 
      bgColor: 'bg-gradient-to-br from-amber-50 to-orange-50',
      iconColor: 'text-amber-600' 
    },
    { 
      label: 'Receita Estimada', 
      value: 'R$ 2.450', 
      change: '+15% este mês', 
      icon: <DollarSign size={18} />, 
      bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      iconColor: 'text-emerald-600' 
    },
    { 
      label: 'Posts Publicados', 
      value: '28', 
      change: '+8 esta semana', 
      icon: <TrendingUp size={18} />, 
      bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50',
      iconColor: 'text-purple-600' 
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Onboarding Modal */}
      <OnboardingModal 
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        userName={user?.name?.split(' ')[0]}
      />
      
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
              Olá, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-slate-600">Monitore o desempenho dos seus blogs e receita</p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="mt-2 text-sm text-coral hover:text-coral-dark transition-colors inline-flex items-center gap-1"
            >
              <PlayCircle className="w-4 h-4" />
              Ver guia inicial
            </button>
          </div>
          
          {/* Plan Display */}
          <div className="bg-white rounded-2xl p-4 shadow-soft">
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Seu Plano</p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-32 rounded-lg bg-gradient-to-r from-coral to-rose-400 shadow-sm flex items-center justify-center">
                <span className="text-white font-semibold text-sm">PRO</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Plano Pro</p>
                <p className="text-xs text-slate-500">3 blogs • 100 reviews/mês</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsCards.map((stat, index) => (
            <div key={index} className="group bg-white rounded-2xl p-5 shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${stat.bgColor} ${stat.iconColor}`}>
                  {stat.icon}
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Courses Section */}
      {courses && courses.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Trilha de Aprendizado</h2>
              <p className="text-sm text-slate-500 mt-1">Continue de onde parou</p>
            </div>
            <button className="text-coral hover:text-coral-dark text-sm font-medium flex items-center gap-1 transition-colors">
              Ver todos <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {coursesLoading ? (
              <div className="col-span-3 text-center py-8 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Carregando cursos...
              </div>
            ) : courses?.slice(0, 3).map((course: any) => (
              <div 
                key={course.id} 
                className={`group bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-medium transition-all duration-300 ${
                  course.isLocked ? 'opacity-75' : ''
                }`}
              >
                {/* Course Image */}
                <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                  {course.thumbnail ? (
                    <img 
                      src={course.thumbnail} 
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className={`absolute top-3 left-3 h-1 w-16 rounded-full ${getBeltClass(course.belt || 'branca')}`} />
                  {course.isLocked && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium text-slate-700">
                        🔒 Bloqueado
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Course Content */}
                <div className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-coral transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">{course.description}</p>
                  
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                    <span>{course.totalLessons || 0} aulas</span>
                    <span>•</span>
                    <span>{formatTime(course.duration || 0)}</span>
                    <span>•</span>
                    <span>{course.students || 0} alunos</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-slate-600">Progresso</span>
                      <span className="text-xs font-bold text-slate-900">{course.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-coral-light to-coral transition-all duration-500"
                        style={{ width: `${course.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Continue Learning CTA */}
        <div className="lg:col-span-2">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-20 -top-20 w-60 h-60 bg-coral rounded-full blur-3xl" />
              <div className="absolute -left-20 -bottom-20 w-60 h-60 bg-blue-500 rounded-full blur-3xl" />
            </div>
            
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-coral" size={20} />
                <span className="text-coral text-sm font-medium">Continue de onde parou</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {courses?.[0]?.currentLesson?.title || 'WordPress Performance'}
              </h3>
              <p className="text-slate-300 mb-6">
                {courses?.[0]?.title || 'Módulo 3: Otimização avançada'}
              </p>
              
              <div className="flex items-center gap-4">
                <button className="bg-coral hover:bg-coral-dark text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 shadow-lg shadow-coral/20">
                  <PlayCircle size={18} />
                  Continuar Assistindo
                </button>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span>234 online agora</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Conquistas Recentes</h3>
          {achievementsLoading ? (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {achievements?.slice(0, 5).map((achievement: any) => (
                <div
                  key={achievement.id}
                  className={`relative group ${achievement.unlocked ? '' : 'opacity-40'}`}
                >
                  <div className="text-2xl p-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl hover:from-coral-50 hover:to-rose-50 transition-all duration-300 cursor-pointer flex items-center justify-center">
                    {achievement.icon}
                  </div>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {achievement.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      {activities && activities.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Atividade Recente da Escola</h3>
          <div className="space-y-3">
            {activities.map((activity: any) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-1 h-8 rounded ${getBeltClass(activity.userBelt)} flex-shrink-0 mt-1`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">{activity.userName}</span>
                    <span className="text-slate-600"> {activity.action} </span>
                    <span className="font-medium">{activity.target}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDistanceToNow(new Date(activity.timestamp), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};