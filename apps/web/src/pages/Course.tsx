import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Lock, CheckCircle, Clock, Award, ChevronLeft, Loader2, Users, BarChart3 } from 'lucide-react';
import { useCourse, useModules } from '../hooks/useCourses';
import { useAuth } from '../contexts/AuthContext';

export const Course: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number>(0);
  
  const { data: course, isLoading: courseLoading } = useCourse(courseId || '');
  const { data: modules, isLoading: modulesLoading } = useModules(courseId || '');

  if (courseLoading || modulesLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-coral mx-auto mb-4" />
          <p className="text-slate-600">Carregando curso...</p>
        </div>
      </div>
    );
  }

  if (!course || !modules) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Curso não encontrado</p>
          <button
            onClick={() => navigate('/courses')}
            className="text-coral hover:text-coral-dark font-medium"
          >
            Voltar para cursos
          </button>
        </div>
      </div>
    );
  }

  const currentModule = modules[selectedModuleIndex];
  const completedLessons = modules.reduce((acc, m) => acc + (m.completedLessons || 0), 0);
  const totalLessons = modules.reduce((acc, m) => acc + m.lessonCount, 0);
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Voltar</span>
        </button>

        <div className="bg-white rounded-2xl shadow-soft p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 mb-3">{course.title}</h1>
              <p className="text-slate-600 mb-4">{course.description}</p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <Users size={16} />
                  <span>{course.students || 0} alunos</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={16} />
                  <span>{Math.floor((course.duration || 0) / 60)}h de conteúdo</span>
                </div>
                <div className="flex items-center gap-1">
                  <BarChart3 size={16} />
                  <span>Nível {course.level}</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="relative">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-slate-200"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="42"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                    className="text-coral transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900">{progress}%</span>
                </div>
              </div>
              <p className="text-sm text-slate-600 mt-2">Progresso Total</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${getBeltClass(course.belt || 'branca')}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>{completedLessons} aulas completas</span>
              <span>{totalLessons} aulas no total</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modules Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-soft p-5">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Módulos do Curso</h2>
            <div className="space-y-2">
              {modules.map((module, index) => (
                <button
                  key={module.id}
                  onClick={() => !module.isLocked && setSelectedModuleIndex(index)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedModuleIndex === index
                      ? 'bg-coral text-white shadow-md'
                      : module.isLocked
                      ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                  disabled={module.isLocked}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1 line-clamp-2">{module.title}</h3>
                      <div className={`text-xs ${selectedModuleIndex === index ? 'text-white/90' : 'text-slate-500'}`}>
                        {module.lessonCount} aulas • {Math.floor((module.duration || 0) / 60)}h {(module.duration || 0) % 60}min
                      </div>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      {module.isLocked ? (
                        <Lock size={18} />
                      ) : (
                        <div className={`text-xs font-medium ${selectedModuleIndex === index ? 'text-white' : 'text-slate-600'}`}>
                          {module.completedLessons}/{module.lessonCount}
                        </div>
                      )}
                    </div>
                  </div>
                  {!module.isLocked && module.progress > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-white/20 rounded-full h-1">
                        <div 
                          className={`h-1 rounded-full ${selectedModuleIndex === index ? 'bg-white' : 'bg-coral'}`}
                          style={{ width: `${module.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Achievement Card */}
          <div className="bg-gradient-to-br from-coral to-coral-dark rounded-2xl p-6 mt-4 text-white shadow-soft">
            <Award size={32} className="mb-3" />
            <h3 className="text-lg font-bold mb-2">Conquiste sua Graduação</h3>
            <p className="text-sm opacity-90 mb-4">
              Complete todos os módulos para evoluir sua faixa e desbloquear benefícios
            </p>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <CheckCircle size={16} className="mr-2 flex-shrink-0" />
                <span>Certificado de conclusão</span>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle size={16} className="mr-2 flex-shrink-0" />
                <span>Acesso à comunidade VIP</span>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle size={16} className="mr-2 flex-shrink-0" />
                <span>Ferramentas exclusivas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lessons Content */}
        <div className="lg:col-span-2">
          {currentModule && (
            <div className="bg-white rounded-2xl shadow-soft p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <span>Módulo {currentModule.order}</span>
                  <span>•</span>
                  <span>{currentModule.progress}% completo</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">{currentModule.title}</h2>
                <p className="text-slate-600">{currentModule.description}</p>
              </div>

              <div className="space-y-3">
                {currentModule.lessons?.map((lesson: any, lessonIndex: number) => (
                  <div
                    key={lesson._id || lesson.id}
                    onClick={() => !currentModule.isLocked && !lesson.locked && navigate(`/courses/${courseId}/modules/${currentModule.id}/lessons/${lesson._id || lesson.id}`)}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      currentModule.isLocked || lesson.locked
                        ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                        : lesson.completed
                        ? 'bg-green-50 border-green-200 cursor-pointer hover:bg-green-100'
                        : 'bg-white border-slate-200 cursor-pointer hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                        lesson.completed
                          ? 'bg-green-500 text-white'
                          : currentModule.isLocked || lesson.locked
                          ? 'bg-slate-300 text-slate-500'
                          : 'bg-coral text-white'
                      }`}>
                        {lesson.completed ? (
                          <CheckCircle size={20} />
                        ) : currentModule.isLocked || lesson.locked ? (
                          <Lock size={16} />
                        ) : (
                          <Play size={16} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold ${currentModule.isLocked || lesson.locked ? 'text-slate-400' : 'text-slate-900'}`}>
                          Aula {lessonIndex + 1}: {lesson.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            <span>{Math.floor((lesson.duration || 0) / 60)}:{String((lesson.duration || 0) % 60).padStart(2, '0')}</span>
                          </div>
                          {lesson.type && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{lesson.type === 'video' ? 'Vídeo' : lesson.type}</span>
                            </>
                          )}
                          {lesson.isFree && (
                            <>
                              <span>•</span>
                              <span className="text-green-600 font-medium">Grátis</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {!currentModule.isLocked && !lesson.locked && (
                      <button className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        lesson.completed
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-coral text-white hover:bg-coral-dark'
                      }`}>
                        {lesson.completed ? 'Revisar' : 'Assistir'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};