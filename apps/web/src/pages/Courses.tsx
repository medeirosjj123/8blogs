import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, TrendingUp, Search, Filter, Loader2, BookOpen, ChevronRight, Lock } from 'lucide-react';
import { useCourses } from '../hooks/useCourses';
import { useUsage } from '../hooks/useUsage';
import { UpgradePrompt } from '../components/UpgradePrompt';

export const Courses: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  
  const { data: courses, isLoading, error } = useCourses();
  const { usage } = useUsage();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  // Debug logging
  React.useEffect(() => {
    console.log('Courses Debug:', { courses, isLoading, error });
  }, [courses, isLoading, error]);

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

  const handleCourseClick = (course: any) => {
    // Check if course is locked
    if (course.isLocked) {
      return;
    }

    // Check if user is Black Belt (required for course access)
    const isBlackBelt = usage?.plan === 'black_belt';
    
    if (!isBlackBelt) {
      setShowUpgradePrompt(true);
      return;
    }

    // User has access, navigate to course
    navigate(`/course/${course.id}`);
  };

  const filteredCourses = courses?.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral mx-auto mb-4" />
          <p className="text-slate-600">Carregando cursos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Erro ao carregar cursos</p>
          <p className="text-slate-400 text-sm">{(error as any)?.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent mb-3">
          Trilha de Aprendizado
        </h1>
        <p className="text-slate-600">
          Evolua suas habilidades e conquiste sua graduação no mundo do SEO
        </p>
        
        {/* Black Belt Access Banner */}
        {usage?.plan !== 'black_belt' && (
          <div className="mt-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Exclusivo para Black Belts</h3>
                <p className="text-sm text-yellow-700">
                  Os cursos são exclusivos para membros Black Belt ativos. Mantenha sua assinatura para continuar aprendendo.
                </p>
              </div>
              <button
                onClick={() => window.location.href = '/pricing'}
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium px-6 py-2 rounded-xl transition-colors"
              >
                Virar Black Belt
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-soft p-5 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar cursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedLevel('all')}
              className={`px-5 py-3 rounded-xl font-medium transition-all ${
                selectedLevel === 'all'
                  ? 'bg-coral text-white shadow-md'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedLevel('beginner')}
              className={`px-5 py-3 rounded-xl font-medium transition-all ${
                selectedLevel === 'beginner'
                  ? 'bg-coral text-white shadow-md'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Iniciante
            </button>
            <button
              onClick={() => setSelectedLevel('intermediate')}
              className={`px-5 py-3 rounded-xl font-medium transition-all ${
                selectedLevel === 'intermediate'
                  ? 'bg-coral text-white shadow-md'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Intermediário
            </button>
            <button
              onClick={() => setSelectedLevel('advanced')}
              className={`px-5 py-3 rounded-xl font-medium transition-all ${
                selectedLevel === 'advanced'
                  ? 'bg-coral text-white shadow-md'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Avançado
            </button>
          </div>
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses && filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className={`group bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-medium transition-all duration-300 cursor-pointer ${
                course.isLocked ? 'opacity-75' : ''
              }`}
              onClick={() => handleCourseClick(course)}
            >
              {/* Course Image */}
              <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
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
                
                {/* Belt indicator */}
                <div className={`absolute top-4 left-4 h-2 w-20 rounded-full ${getBeltClass(course.belt || 'branca')} shadow-lg`} />
                
                {/* Level badge */}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-slate-700">
                  {course.level === 'beginner' ? 'Iniciante' : 
                   course.level === 'intermediate' ? 'Intermediário' : 'Avançado'}
                </div>
                
                {course.isLocked && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium text-slate-700">
                      🔒 Bloqueado
                    </div>
                  </div>
                )}
                
                {!course.isLocked && usage?.plan !== 'black_belt' && (
                  <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/40 to-transparent flex items-center justify-center">
                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2">
                      <Lock size={14} />
                      Black Belt
                    </div>
                  </div>
                )}
              </div>

              {/* Course Content */}
              <div className="p-6">
                <h3 className="font-semibold text-lg text-slate-900 mb-2 group-hover:text-coral transition-colors line-clamp-2">
                  {course.title}
                </h3>
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                  {course.description}
                </p>

                {/* Course Stats */}
                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-1">
                    <BookOpen size={14} />
                    <span>{course.totalLessons || 0} aulas</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{formatTime(course.duration || 0)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={14} />
                    <span>{course.students || 0}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                {course.progress !== undefined && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-slate-600">Progresso</span>
                      <span className="text-xs font-bold text-slate-900">{course.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-coral-light to-coral transition-all duration-500"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* CTA Button */}
                <button
                  className={`w-full mt-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    course.isLocked
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : course.progress > 0
                      ? 'bg-coral text-white hover:bg-coral-dark shadow-lg shadow-coral/20'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                  disabled={course.isLocked}
                >
                  {course.isLocked ? (
                    'Bloqueado'
                  ) : course.progress > 0 ? (
                    <>
                      Continuar Aprendendo
                      <ChevronRight size={16} />
                    </>
                  ) : (
                    <>
                      Começar Agora
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <BookOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            Nenhum curso encontrado
          </h3>
          <p className="text-slate-600">
            Tente ajustar os filtros ou faça uma nova busca
          </p>
        </div>
      )}

      {/* Upgrade Prompt for Course Access */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        limitType="blogs" // Use blogs as generic limit type
        currentPlan={usage?.plan || 'starter'}
        used={0}
        limit={1}
        onUpgrade={() => {
          navigate('/precos');
          setShowUpgradePrompt(false);
        }}
      />
    </div>
  );
};