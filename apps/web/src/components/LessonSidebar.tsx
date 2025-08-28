import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  PlayCircle, 
  FileText, 
  HelpCircle, 
  CheckCircle,
  Lock,
  X
} from 'lucide-react';

interface Lesson {
  _id: string;
  title: string;
  slug: string;
  type: string;
  duration: number;
  isFree: boolean;
  isCompleted?: boolean;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  progress?: number;
  isLocked?: boolean;
}

interface LessonSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  courseId: string;
  moduleId: string;
  currentLessonId: string;
  modules: Module[];
}

export default function LessonSidebar({
  isOpen,
  onToggle,
  courseId,
  moduleId,
  currentLessonId,
  modules
}: LessonSidebarProps) {
  const navigate = useNavigate();

  const getLessonIcon = (type: string, isCompleted?: boolean) => {
    if (isCompleted) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    switch (type) {
      case 'video': return <PlayCircle className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      case 'quiz': return <HelpCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const navigateToLesson = (moduleId: string, lessonId: string) => {
    navigate(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`);
  };

  return (
    <>
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-80 bg-gray-900 border-r border-gray-800 transform transition-transform z-40 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Conteúdo do Curso</h2>
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-white transition-colors md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modules List */}
        <div className="overflow-y-auto h-[calc(100vh-80px)]">
          {modules.map((module, moduleIndex) => (
            <div key={module.id} className="border-b border-gray-800">
              {/* Module Header */}
              <div className="p-4 bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-white">
                      Módulo {moduleIndex + 1}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">{module.title}</p>
                  </div>
                  {module.isLocked && (
                    <Lock className="w-4 h-4 text-gray-500" />
                  )}
                  {module.progress !== undefined && module.progress > 0 && (
                    <div className="text-xs text-gray-400">
                      {module.progress}%
                    </div>
                  )}
                </div>
                {module.progress !== undefined && (
                  <div className="mt-2 w-full bg-gray-700 rounded-full h-1">
                    <div 
                      className="bg-green-500 h-1 rounded-full transition-all"
                      style={{ width: `${module.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Lessons List */}
              <div className="py-2">
                {(module.lessons || []).map((lesson, lessonIndex) => {
                  const isCurrentLesson = lesson._id === currentLessonId;
                  const isAccessible = lesson.isFree || !module.isLocked;

                  return (
                    <button
                      key={lesson._id}
                      onClick={() => isAccessible && navigateToLesson(module.id, lesson._id)}
                      disabled={!isAccessible}
                      className={`w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-800/50 transition-colors ${
                        isCurrentLesson ? 'bg-red-900/20 border-l-2 border-red-500' : ''
                      } ${!isAccessible ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex-shrink-0">
                        {!isAccessible ? (
                          <Lock className="w-4 h-4 text-gray-500" />
                        ) : (
                          getLessonIcon(lesson.type, lesson.isCompleted)
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`text-sm ${
                          isCurrentLesson ? 'text-white font-medium' : 'text-gray-300'
                        } ${lesson.isCompleted ? 'line-through opacity-75' : ''}`}>
                          {lessonIndex + 1}. {lesson.title}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {lesson.duration} min
                          </span>
                          {lesson.isFree && (
                            <span className="text-xs text-green-500 font-medium">
                              Grátis
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toggle Button (visible when sidebar is closed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-0 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white p-2 rounded-r-lg border border-l-0 border-gray-800 z-30 hover:bg-gray-800 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </>
  );
}