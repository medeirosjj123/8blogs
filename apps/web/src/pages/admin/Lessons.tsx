import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  Play,
  FileText,
  HelpCircle,
  GripVertical,
  Youtube,
  Globe,
  BookOpen,
  Star
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import { LessonEditor } from '../../components/admin/LessonEditor';
import toast from 'react-hot-toast';


export default function AdminLessons() {
  const { courseId, moduleId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [showLessonEditor, setShowLessonEditor] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);

  // Fetch module details
  const { data: moduleData } = useQuery({
    queryKey: ['admin-module', moduleId],
    queryFn: async () => {
      const modules = await adminService.getModules(courseId!);
      return modules.find((m: any) => m._id === moduleId);
    },
    enabled: !!courseId && !!moduleId
  });

  // Fetch lessons
  const { data: lessons, isLoading } = useQuery({
    queryKey: ['admin-lessons', moduleId],
    queryFn: () => adminService.getLessons(moduleId!),
    enabled: !!moduleId
  });

  const handleSaveLesson = async (lessonData: any) => {
    try {
      if (selectedLesson) {
        await adminService.updateLesson(selectedLesson._id, lessonData);
        toast.success('Aula atualizada com sucesso');
      } else {
        await adminService.createLesson(moduleId!, lessonData);
        toast.success('Aula criada com sucesso');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-lessons', moduleId] });
      setShowLessonEditor(false);
      setSelectedLesson(null);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar aula');
      throw error;
    }
  };

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: string) => adminService.deleteLesson(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-lessons', moduleId] });
      toast.success('Aula removida com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover aula');
    }
  });


  const openCreateModal = () => {
    setSelectedLesson(null);
    setShowLessonEditor(true);
  };

  const openEditModal = (lesson: any) => {
    setSelectedLesson(lesson);
    setShowLessonEditor(true);
  };


  const handleDelete = (lessonId: string) => {
    if (confirm('Tem certeza que deseja remover esta aula?')) {
      deleteLessonMutation.mutate(lessonId);
    }
  };


  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video': return <Play className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      case 'quiz': return <HelpCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/admin/courses/${courseId}/modules`)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Aulas do Módulo</h1>
            <p className="text-slate-400 mt-1">
              {moduleData?.title || 'Carregando...'}
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Aula
        </button>
      </div>

      {/* Lessons List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-900 rounded-lg p-6 border border-slate-800 animate-pulse">
              <div className="h-6 bg-slate-800 rounded w-1/3 mb-3" />
              <div className="h-4 bg-slate-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : lessons && lessons.length > 0 ? (
        <div className="space-y-4">
          {lessons.sort((a: any, b: any) => a.order - b.order).map((lesson: any, index: number) => (
            <div key={lesson._id} className="bg-slate-900 rounded-lg p-6 border border-slate-800 hover:border-coral/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <GripVertical className="w-5 h-5" />
                    <span className="text-lg font-bold text-coral">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${
                        lesson.type === 'video' ? 'bg-blue-900/30 text-blue-400' :
                        lesson.type === 'text' ? 'bg-green-900/30 text-green-400' :
                        'bg-purple-900/30 text-purple-400'
                      }`}>
                        {getLessonIcon(lesson.type)}
                      </div>
                      <h3 className="text-lg font-semibold text-white">
                        {lesson.title}
                      </h3>
                      {lesson.isFree && (
                        <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full">
                          Grátis
                        </span>
                      )}
                    </div>
                    {lesson.description && (
                      <p className="text-slate-400 text-sm mb-3">
                        {lesson.description}
                      </p>
                    )}
                    <div className="flex items-center gap-6 text-sm text-slate-500">
                      <span>{lesson.duration || 10} min</span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400" />
                        {lesson.xpReward || 50} XP
                      </span>
                      {lesson.type === 'video' && lesson.videoProvider && (
                        <span className="flex items-center gap-1">
                          {lesson.videoProvider === 'youtube' ? <Youtube className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                          {lesson.videoProvider}
                        </span>
                      )}
                      {lesson.type === 'quiz' && (
                        <span>{lesson.questions?.length || 0} questões</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(lesson)}
                    className="p-2 text-slate-400 hover:text-coral transition-colors rounded-lg hover:bg-slate-800"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(lesson._id)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
          <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhuma aula encontrada</h3>
          <p className="text-slate-400 mb-6">Comece criando a primeira aula do módulo</p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar Primeira Aula
          </button>
        </div>
      )}

      {/* Enhanced Lesson Editor Modal */}
      {showLessonEditor && (
        <LessonEditor
          lesson={selectedLesson}
          moduleId={moduleId!}
          onSave={handleSaveLesson}
          onCancel={() => {
            setShowLessonEditor(false);
            setSelectedLesson(null);
          }}
        />
      )}
    </div>
  );
}