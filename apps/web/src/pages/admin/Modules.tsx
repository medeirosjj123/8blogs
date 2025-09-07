import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus,
  BookOpen,
  Edit,
  Trash2,
  GripVertical,
  ChevronLeft,
  Play,
  FileText,
  HelpCircle,
  Eye
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import toast from 'react-hot-toast';

export default function AdminModules() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [moduleForm, setModuleForm] = useState({
    title: '',
    description: '',
    order: 1
  });

  // Fetch course details
  const { data: courseData } = useQuery({
    queryKey: ['admin-course', courseId],
    queryFn: async () => {
      const courses = await adminService.getCourses();
      return courses.find((c: any) => c._id === courseId);
    },
    enabled: !!courseId
  });

  // Fetch modules
  const { data: modules, isLoading } = useQuery({
    queryKey: ['admin-modules', courseId],
    queryFn: () => adminService.getModules(courseId!),
    enabled: !!courseId
  });

  const createModuleMutation = useMutation({
    mutationFn: (moduleData: any) => adminService.createModule(courseId!, moduleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-modules', courseId] });
      toast.success('Módulo criado com sucesso');
      setShowModuleModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar módulo');
    }
  });

  const updateModuleMutation = useMutation({
    mutationFn: ({ moduleId, moduleData }: { moduleId: string; moduleData: any }) => 
      adminService.updateModule(moduleId, moduleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-modules', courseId] });
      toast.success('Módulo atualizado com sucesso');
      setShowModuleModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar módulo');
    }
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (moduleId: string) => adminService.deleteModule(moduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-modules', courseId] });
      toast.success('Módulo removido com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover módulo');
    }
  });

  const resetForm = () => {
    setModuleForm({
      title: '',
      description: '',
      order: modules?.length ? modules.length + 1 : 1
    });
    setSelectedModule(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModuleModal(true);
  };

  const openEditModal = (module: any) => {
    setSelectedModule(module);
    setModuleForm({
      title: module.title || '',
      description: module.description || '',
      order: module.order || 1
    });
    setShowModuleModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedModule) {
      updateModuleMutation.mutate({ moduleId: selectedModule._id, moduleData: moduleForm });
    } else {
      createModuleMutation.mutate(moduleForm);
    }
  };

  const handleDelete = (moduleId: string) => {
    if (confirm('Tem certeza que deseja remover este módulo? Todas as aulas serão removidas também.')) {
      deleteModuleMutation.mutate(moduleId);
    }
  };

  const navigateToLessons = (moduleId: string) => {
    navigate(`/admin/courses/${courseId}/modules/${moduleId}/lessons`);
  };

  if (!courseId) {
    return (
      <div className="p-6">
        <p className="text-white">Curso não encontrado</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/courses')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Módulos do Curso</h1>
            <p className="text-slate-400 mt-1">
              {courseData?.title || 'Carregando...'}
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Módulo
        </button>
      </div>

      {/* Modules List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-900 rounded-lg p-6 border border-slate-800 animate-pulse">
              <div className="h-6 bg-slate-800 rounded w-1/3 mb-3" />
              <div className="h-4 bg-slate-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (Array.isArray(modules) && modules.length > 0) ? (
        <div className="space-y-4">
          {modules.sort((a: any, b: any) => a.order - b.order).map((module: any, index: number) => (
            <div key={module._id} className="bg-slate-900 rounded-lg border border-slate-800 hover:border-coral/50 transition-colors">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <GripVertical className="w-5 h-5" />
                      <span className="text-lg font-bold text-coral">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {module.title}
                      </h3>
                      {module.description && (
                        <p className="text-slate-400 text-sm mb-4">
                          {module.description}
                        </p>
                      )}
                      
                      {/* Lessons Preview */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {module.lessons && module.lessons.length > 0 ? (
                          module.lessons.slice(0, 3).map((lesson: any) => (
                            <div key={lesson._id} className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
                              {lesson.type === 'video' && <Play className="w-3 h-3" />}
                              {lesson.type === 'text' && <FileText className="w-3 h-3" />}
                              {lesson.type === 'quiz' && <HelpCircle className="w-3 h-3" />}
                              <span>{lesson.title}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">Nenhuma aula adicionada</span>
                        )}
                        {module.lessons && module.lessons.length > 3 && (
                          <span className="text-xs text-slate-500 px-2 py-1">
                            +{module.lessons.length - 3} mais
                          </span>
                        )}
                      </div>

                      {/* Module Stats */}
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                          <BookOpen className="w-4 h-4" />
                          <span>{module.lessons?.length || 0} aulas</span>
                        </div>
                        {module.duration && (
                          <div className="text-slate-400">
                            {module.duration} min
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateToLessons(module._id)}
                      className="p-2 text-slate-400 hover:text-coral transition-colors rounded-lg hover:bg-slate-800"
                      title="Gerenciar Aulas"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(module)}
                      className="p-2 text-slate-400 hover:text-coral transition-colors rounded-lg hover:bg-slate-800"
                      title="Editar Módulo"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(module._id)}
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                      title="Remover Módulo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="border-t border-slate-800 px-6 py-3 bg-slate-800/30">
                <button
                  onClick={() => navigateToLessons(module._id)}
                  className="flex items-center gap-2 text-sm text-coral hover:text-coral-dark transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar ou Gerenciar Aulas
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
          <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhum módulo encontrado</h3>
          <p className="text-slate-400 mb-6">Comece criando o primeiro módulo do curso</p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar Primeiro Módulo
          </button>
        </div>
      )}

      {/* Module Form Modal */}
      {showModuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-white mb-6">
              {selectedModule ? 'Editar Módulo' : 'Criar Novo Módulo'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Título do Módulo *
                </label>
                <input
                  type="text"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Ex: Fundamentos de SEO On-Page"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descrição
                </label>
                <textarea
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                  rows={3}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  placeholder="Descreva o conteúdo deste módulo..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Ordem
                </label>
                <input
                  type="number"
                  value={moduleForm.order}
                  onChange={(e) => setModuleForm({ ...moduleForm, order: parseInt(e.target.value) })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  min="1"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Define a ordem de exibição do módulo no curso
                </p>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModuleModal(false)}
                  className="flex-1 py-2 px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createModuleMutation.isPending || updateModuleMutation.isPending}
                  className="flex-1 py-2 px-4 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50"
                >
                  {createModuleMutation.isPending || updateModuleMutation.isPending
                    ? 'Salvando...'
                    : selectedModule
                    ? 'Atualizar Módulo'
                    : 'Criar Módulo'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}