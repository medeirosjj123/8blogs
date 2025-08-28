import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  PlayCircle, 
  FileText, 
  HelpCircle,
  Lock,
  Clock,
  Menu,
  X,
  Home,
  LogOut,
  User,
  Trophy,
  ChevronDown
} from 'lucide-react';
import { lessonService } from '../services/lesson.service';
import { progressService } from '../services/progress.service';
import { useAuth } from '../contexts/AuthContext';
import VideoPlayer from '../components/VideoPlayer';
import QuizComponent from '../components/QuizComponent';

export default function LessonView() {
  const { courseId, moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Fetch lesson data
  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => lessonService.getLesson(lessonId!),
    enabled: !!lessonId
  });

  // Fetch course modules for sidebar
  const { data: modulesData, isLoading: modulesLoading } = useQuery({
    queryKey: ['course', courseId, 'modules'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/courses/${courseId}/modules`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      return response.json();
    },
    enabled: !!courseId
  });

  // Mark lesson as completed
  const completeMutation = useMutation({
    mutationFn: () => progressService.markLessonComplete(lessonId!),
    onSuccess: () => {
      setLessonCompleted(true);
      // Navigate to next lesson after delay
      if (lesson?.nextLesson) {
        setTimeout(() => {
          navigate(`/courses/${courseId}/modules/${moduleId}/lessons/${lesson.nextLesson.id}`);
        }, 2000);
      }
    }
  });

  const handleVideoComplete = () => {
    if (!lessonCompleted) {
      completeMutation.mutate();
    }
  };

  const handleQuizComplete = (score: number) => {
    if (score >= 70 && !lessonCompleted) {
      completeMutation.mutate();
    }
  };

  const navigateToLesson = (modId: string, lesId: string) => {
    navigate(`/courses/${courseId}/modules/${modId}/lessons/${lesId}`);
  };

  const exitToCourse = () => {
    navigate(`/course/${courseId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <PlayCircle className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      case 'quiz': return <HelpCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  if (lessonLoading || modulesLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Carregando aula...</div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Aula não encontrada</div>
      </div>
    );
  }

  const modules = modulesData?.data || [];
  const totalLessons = modules.reduce((acc: number, mod: any) => acc + (mod.lessons?.length || 0), 0);
  const completedLessons = modules.reduce((acc: number, mod: any) => {
    return acc + (mod.lessons?.filter((l: any) => l.completed).length || 0);
  }, 0);
  const courseProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Minimal Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo/Home */}
          <button
            onClick={exitToCourse}
            className="flex items-center gap-2 text-white hover:text-coral transition-colors"
          >
            <div className="w-8 h-8 bg-coral rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">T</span>
            </div>
            <span className="font-semibold hidden sm:inline">Tatame</span>
          </button>

          {/* Course Title */}
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
            <span>{lesson.courseTitle || 'Curso'}</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">{lesson.title}</span>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* XP Display */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-lg">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-white font-medium">{user?.xp || 0} XP</span>
            <span className="text-xs text-slate-400">Nível {user?.level || 1}</span>
          </div>

          {/* Exit Course Button */}
          <button
            onClick={exitToCourse}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-white transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm">Sair do Curso</span>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 bg-coral rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-lg border border-slate-700 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-700">
                  <p className="text-sm font-medium text-white">{user?.name || user?.email}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
                <button
                  onClick={() => navigate('/perfil')}
                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <User className="w-4 h-4 inline mr-2" />
                  Perfil
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4 inline mr-2" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Lesson Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 bg-slate-900 border-r border-slate-800 overflow-hidden flex flex-col`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">Conteúdo do Curso</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Course Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Progresso do Curso</span>
                <span className="text-coral font-medium">{courseProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-coral to-coral-dark h-2 rounded-full transition-all"
                  style={{ width: `${courseProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{completedLessons} de {totalLessons} aulas</span>
              </div>
            </div>
          </div>

          {/* Modules List */}
          <div className="flex-1 overflow-y-auto">
            {modules.map((module: any, moduleIndex: number) => {
              const isCurrentModule = module.id === moduleId;
              const moduleCompleted = module.lessons?.every((l: any) => l.completed);
              
              return (
                <div key={module.id} className="border-b border-slate-800">
                  {/* Module Header */}
                  <div className={`p-4 cursor-pointer ${isCurrentModule ? 'bg-slate-800' : 'bg-slate-900/50 hover:bg-slate-800/50'} transition-colors`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-slate-500">Módulo {moduleIndex + 1}</div>
                          {moduleCompleted && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                        <div className="text-sm font-medium text-white mt-1">{module.title}</div>
                      </div>
                      {module.progress > 0 && (
                        <div className="text-xs text-coral">{module.progress}%</div>
                      )}
                    </div>
                    {module.progress !== undefined && (
                      <div className="mt-2 w-full bg-slate-700 rounded-full h-1">
                        <div 
                          className="bg-coral h-1 rounded-full transition-all"
                          style={{ width: `${module.progress || 0}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Lessons - Always visible */}
                  <div className="bg-slate-950/50">
                    {(module.lessons || []).map((les: any, lessonIndex: number) => {
                      const isCurrentLesson = les._id === lessonId;
                      const isLocked = !les.isFree && module.isLocked;
                      
                      return (
                        <button
                          key={les._id}
                          onClick={() => !isLocked && navigateToLesson(module.id, les._id)}
                          disabled={isLocked}
                          className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800/50 transition-colors ${
                            isCurrentLesson ? 'bg-coral/10 border-l-4 border-coral' : ''
                          } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex-shrink-0">
                            {isLocked ? (
                              <Lock className="w-4 h-4 text-slate-500" />
                            ) : les.completed ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              getLessonIcon(les.type)
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className={`text-sm ${isCurrentLesson ? 'text-coral font-medium' : 'text-slate-300'}`}>
                              {lessonIndex + 1}. {les.title}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{les.duration} min</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-slate-950">
          {/* Toggle Sidebar Button (when closed) */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed left-4 top-24 z-40 p-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Lesson Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto p-6">
              {/* Lesson Title */}
              <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                  <span>Módulo {moduleId?.split('-')[1] || '1'}</span>
                  <ChevronRight className="w-4 h-4" />
                  <span>{lesson.moduleTitle}</span>
                </div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  {getLessonIcon(lesson.type)}
                  {lesson.title}
                </h1>
                <div className="flex items-center gap-4 mt-3">
                  {lesson.duration && (
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{lesson.duration} min</span>
                    </div>
                  )}
                  {lessonCompleted && (
                    <div className="flex items-center gap-1 text-green-500">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Aula Concluída</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Video Lesson */}
              {lesson.type === 'video' && (
                <div className="mb-8">
                  <VideoPlayer
                    url={lesson.videoUrl}
                    provider={lesson.videoProvider}
                    videoId={lesson.videoId}
                    onComplete={handleVideoComplete}
                  />
                </div>
              )}

              {/* Text Lesson */}
              {lesson.type === 'text' && (
                <div className="bg-slate-900 rounded-lg p-8 mb-8">
                  <div 
                    className="prose prose-invert max-w-none text-slate-300"
                    dangerouslySetInnerHTML={{ __html: lesson.content || '<p>Conteúdo sendo preparado...</p>' }}
                  />
                  {!lessonCompleted && (
                    <div className="mt-8 flex justify-center">
                      <button
                        onClick={() => completeMutation.mutate()}
                        className="px-6 py-3 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Marcar como Concluída
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Quiz Lesson */}
              {lesson.type === 'quiz' && (
                <QuizComponent
                  questions={lesson.questions || []}
                  onComplete={handleQuizComplete}
                />
              )}

              {/* Lesson Info */}
              {lesson.description && (
                <div className="bg-slate-900 rounded-lg p-6 mb-8">
                  <h2 className="text-xl font-semibold text-white mb-4">Sobre esta aula</h2>
                  <p className="text-slate-400">{lesson.description}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between items-center mt-12 pb-8">
                <button
                  onClick={() => lesson.previousLesson && navigate(`/courses/${courseId}/modules/${moduleId}/lessons/${lesson.previousLesson.id}`)}
                  disabled={!lesson.previousLesson}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                    lesson.previousLesson
                      ? 'bg-slate-800 text-white hover:bg-slate-700'
                      : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                  Aula Anterior
                </button>

                <button
                  onClick={() => lesson.nextLesson && navigate(`/courses/${courseId}/modules/${moduleId}/lessons/${lesson.nextLesson.id}`)}
                  disabled={!lesson.nextLesson}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                    lesson.nextLesson
                      ? 'bg-coral text-white hover:bg-coral-dark'
                      : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  Próxima Aula
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}