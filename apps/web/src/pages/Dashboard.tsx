import React, { useState, useEffect } from 'react';
import { ArrowRight, TrendingUp, Clock, Target, Award, PlayCircle, Trophy, Zap, Sparkles, ChevronRight, Loader2, BookOpen, DollarSign, FileText, Globe } from 'lucide-react';
import { useStats, useActivities, useAchievements } from '../hooks/useStats';
import { useCourses } from '../hooks/useCourses';
import { useAuth } from '../contexts/AuthContext';
import { useUsage } from '../hooks/useUsage';
import { OnboardingModal } from '../components/OnboardingModal';
import { UpgradePrompt } from '../components/UpgradePrompt';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: activities, isLoading: activitiesLoading } = useActivities(4);
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { 
    usage, 
    showUpgradePrompt, 
    upgradePromptType, 
    handleUpgradePromptClose 
  } = useUsage();
  
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
          <Loader2 className="w-8 h-8 animate-spin text-bloghouse-primary-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  // Use real usage data or fallback to user subscription
  const usageData = usage || {
    plan: (user?.subscription?.plan || 'starter') as 'starter' | 'pro' | 'premium',
    usage: {
      blogs: { used: 2, limit: user?.subscription?.blogsLimit || 1, percentage: 0 },
      reviews: { used: user?.subscription?.reviewsUsed || 0, limit: user?.subscription?.reviewsLimit || 40, percentage: 0 }
    },
    features: user?.subscription?.features || {
      bulkUpload: false,
      weeklyCalls: false,
      coursesAccess: false,
      prioritySupport: false
    }
  };

  // Format limits for display
  const formatLimit = (used: number, limit: number) => {
    if (limit === -1) return 'Ilimitado'; // Unlimited
    return `${used}/${limit}`;
  };

  const statsCards = [
    { 
      label: 'Blogs Ativos', 
      value: formatLimit(usageData.usage.blogs.used, usageData.usage.blogs.limit),
      change: usageData.usage.blogs.limit === -1 ? 'Ilimitado' : `${Math.max(0, usageData.usage.blogs.limit - usageData.usage.blogs.used)} restantes`,
      icon: <Globe size={18} />, 
      bgColor: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      iconColor: 'text-blue-600' 
    },
    { 
      label: 'Reviews Geradas', 
      value: formatLimit(usageData.usage.reviews.used, usageData.usage.reviews.limit),
      change: usageData.usage.reviews.limit === -1 ? 'Ilimitado' : `${Math.max(0, usageData.usage.reviews.limit - usageData.usage.reviews.used)} restantes`,
      icon: <FileText size={18} />, 
      bgColor: 'bg-gradient-to-br from-amber-50 to-orange-50',
      iconColor: 'text-amber-600' 
    },
    { 
      label: 'Plano Atual', 
      value: usageData.plan.charAt(0).toUpperCase() + usageData.plan.slice(1), 
      change: (user?.subscription?.billingCycle === 'yearly' ? 'Anual' : 'Mensal') || 'Mensal',
      icon: <Award size={18} />, 
      bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      iconColor: 'text-emerald-600' 
    },
    { 
      label: 'Recursos Premium', 
      value: Object.values(usageData.features).filter(Boolean).length.toString(), 
      change: usageData.features.coursesAccess ? 'Cursos inclusos' : 'Upgrades disponíveis',
      icon: <Sparkles size={18} />, 
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
        userPlan={usage?.plan}
      />

      {/* Upgrade Prompt */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={handleUpgradePromptClose}
        limitType={upgradePromptType}
        currentPlan={usageData.plan}
        used={upgradePromptType === 'reviews' ? usageData.usage.reviews.used : usageData.usage.blogs.used}
        limit={upgradePromptType === 'reviews' ? usageData.usage.reviews.limit : usageData.usage.blogs.limit}
      />
      
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent mb-2">
              E aí, {user?.name?.split(' ')[0]}! 💰
            </h1>
            <p className="text-slate-600">
              {usage?.plan === 'black_belt' ? 
                'Dominando o Mercado de Afiliados como um profissional 🔥' : 
                'Pronto para multiplicar sua receita com Amazon Afiliados?'
              }
            </p>
            <button
              onClick={() => setShowOnboarding(true)}
              className="mt-2 text-sm text-bloghouse-primary-600 hover:text-bloghouse-primary-700 transition-colors inline-flex items-center gap-1"
            >
              <PlayCircle className="w-4 h-4" />
              Ver guia inicial
            </button>
          </div>
          
          {/* Plan Display */}
          <div className="bg-white rounded-2xl p-4 shadow-soft">
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Seu Plano</p>
            <div className="flex items-center gap-3">
              {usage?.plan === 'black_belt' ? (
                <div className="h-10 w-32 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-sm flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">BLACK BELT</span>
                </div>
              ) : usage?.plan === 'pro' ? (
                <div className="h-10 w-32 rounded-lg gradient-primary bloghouse-glow flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">PRO</span>
                </div>
              ) : (
                <div className="h-10 w-32 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">STARTER</span>
                </div>
              )}
              <div>
                {usage?.plan === 'black_belt' ? (
                  <>
                    <p className="text-sm font-semibold text-slate-900">Black Belt 🥋</p>
                    <p className="text-xs text-slate-500">Elite Amazon Affiliate</p>
                  </>
                ) : usage?.plan === 'pro' ? (
                  <>
                    <p className="text-sm font-semibold text-slate-900">Pro Blogger</p>
                    <p className="text-xs text-slate-500">Escalando com 3 blogs</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-900">Iniciante</p>
                    <p className="text-xs text-slate-500">Primeiro blog rentável</p>
                  </>
                )}
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

      {/* Tier-Specific Features Section */}
      <div className="mb-8">
        {usage?.plan === 'black_belt' ? (
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Black Belt Elite! 🥋</h3>
                <p className="text-gray-700">Você desbloqueou o nível máximo - hora de dominar o mercado!</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-5 rounded-xl border border-green-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Automação Elite</h4>
                </div>
                <p className="text-sm text-gray-600 mb-2">Upload em massa + reviews ilimitadas</p>
                <p className="text-xs text-green-600 font-medium">Potencial: R$ 10k+/mês com 1 CSV</p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-purple-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Comunidade Black Belt</h4>
                </div>
                <p className="text-sm text-gray-600 mb-2">Networking com os top 1% dos afiliados</p>
                <button 
                  onClick={() => window.location.href = '/comunidade'}
                  className="text-xs text-purple-600 font-medium hover:text-purple-700 transition-colors"
                >
                  Participar agora →
                </button>
              </div>
            </div>
            <div className="gradient-primary rounded-xl p-4 text-white bloghouse-glow">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold mb-1">🎯 Sua Meta Black Belt</h4>
                  <p className="text-sm opacity-90">Próximo marco: R$ 10.000 em comissões mensais</p>
                </div>
                <button 
                  onClick={() => window.location.href = '/ferramentas/gerador-reviews'}
                  className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Gerar conteúdo
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Pronto para ser ELITE? 💎</h3>
                  <p className="text-gray-700">Desbloqueie os segredos dos top affiliates que faturam 6 dígitos</p>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/pricing'}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Ver Black Belt
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white p-4 rounded-xl opacity-75">
                <h4 className="font-semibold text-gray-900 mb-2">🚀 Geração em Massa</h4>
                <p className="text-sm text-gray-600">Apenas para Black Belts</p>
              </div>
              <div className="bg-white p-4 rounded-xl opacity-75">
                <h4 className="font-semibold text-gray-900 mb-2">👥 Comunidade Exclusiva</h4>
                <p className="text-sm text-gray-600">Apenas para Black Belts</p>
              </div>
              <div className="bg-white p-4 rounded-xl opacity-75">
                <h4 className="font-semibold text-gray-900 mb-2">📚 Cursos Exclusivos</h4>
                <p className="text-sm text-gray-600">Apenas para Black Belts</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Courses Section */}
      {courses && courses.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Trilha de Aprendizado</h2>
              <p className="text-sm text-slate-500 mt-1">Continue de onde parou</p>
            </div>
            <button className="text-bloghouse-primary-600 hover:text-bloghouse-primary-700 text-sm font-medium flex items-center gap-1 transition-colors">
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
                  <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-bloghouse-primary-600 transition-colors">
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
                        className="h-full rounded-full gradient-primary transition-all duration-500"
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

      {/* Bottom CTA Section */}
      <div className="mb-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-20 -top-20 w-60 h-60 bg-bloghouse-primary-500 rounded-full blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-60 h-60 bg-blue-500 rounded-full blur-3xl" />
          </div>
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-bloghouse-primary-600" size={20} />
              <span className="text-bloghouse-primary-600 text-sm font-medium">Acelere seus ganhos 🚀</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">
              Próximo Passo: R$ 10.000/mês
            </h3>
            <p className="text-slate-300 mb-6">
              Descubra as estratégias secretas dos Black Belts que faturam alto com Amazon
            </p>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => window.location.href = '/pricing'}
                className="gradient-primary hover:gradient-secondary text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 bloghouse-glow hover:bloghouse-glow-secondary"
              >
                <TrendingUp size={18} />
                Virar Black Belt
              </button>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>+500 Black Belts ativos</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};