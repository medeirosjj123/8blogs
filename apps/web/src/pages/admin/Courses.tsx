import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Plus,
  BookOpen,
  Edit,
  Trash2,
  Users,
  Clock,
  Star,
  Eye,
  Settings,
  Upload,
  X,
  Image
} from 'lucide-react';
import { adminService } from '../../services/admin.service';
import toast from 'react-hot-toast';

export default function AdminCourses() {
  const navigate = useNavigate();
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    shortDescription: '',
    level: 'iniciante',
    duration: '',
    price: 0,
    isPublished: false,
    category: '',
    tags: '',
    thumbnail: ''
  });

  const queryClient = useQueryClient();

  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: () => adminService.getCourses()
  });

  const createCourseMutation = useMutation({
    mutationFn: (courseData: any) => adminService.createCourse(courseData),
    onSuccess: (data) => {
      console.log('Course created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Curso criado com sucesso');
      setShowCourseModal(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Create error:', error);
      toast.error(error.message || 'Erro ao criar curso');
      setIsUploading(false);
    }
  });

  const updateCourseMutation = useMutation({
    mutationFn: ({ courseId, courseData }: { courseId: string; courseData: any }) => 
      adminService.updateCourse(courseId, courseData),
    onSuccess: (data) => {
      console.log('Course updated successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Curso atualizado com sucesso');
      setShowCourseModal(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      toast.error(error.message || 'Erro ao atualizar curso');
      setIsUploading(false);
    }
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (courseId: string) => adminService.deleteCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Curso removido com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover curso');
    }
  });

  const resetForm = () => {
    setCourseForm({
      title: '',
      description: '',
      shortDescription: '',
      level: 'iniciante',
      duration: '',
      price: 0,
      isPublished: false,
      category: '',
      tags: '',
      thumbnail: ''
    });
    setSelectedCourse(null);
    setUploadedFile(null);
    setUploadPreview('');
  };

  const openCreateModal = () => {
    resetForm();
    setShowCourseModal(true);
  };

  const openEditModal = (course: any) => {
    setSelectedCourse(course);
    setCourseForm({
      title: course.title || '',
      description: course.description || '',
      shortDescription: course.shortDescription || '',
      level: course.level || 'iniciante',
      duration: course.duration || '',
      price: course.price || 0,
      isPublished: course.isPublished || false,
      category: course.category || '',
      tags: course.tags ? course.tags.join(', ') : '',
      thumbnail: course.thumbnail || ''
    });
    if (course.thumbnail) {
      setUploadPreview(course.thumbnail);
    }
    setShowCourseModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione apenas arquivos de imagem');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('O arquivo deve ter no máximo 5MB');
        return;
      }
      
      setUploadedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setUploadedFile(null);
    setUploadPreview('');
    setCourseForm({ ...courseForm, thumbnail: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!courseForm.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    
    if (!courseForm.description.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    
    try {
      let thumbnail = courseForm.thumbnail;
      
      // Upload thumbnail if a new file was selected
      if (uploadedFile) {
        setIsUploading(true);
        try {
          const uploadResult = await adminService.uploadThumbnail(uploadedFile);
          thumbnail = uploadResult.url;
          console.log('Upload result:', uploadResult);
          console.log('Thumbnail URL set to:', thumbnail);
        } catch (uploadError: any) {
          toast.error(uploadError.message || 'Erro ao fazer upload da imagem');
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }
      
      // Map Portuguese level to English for API
      const levelMapping = {
        'iniciante': 'beginner',
        'intermediário': 'intermediate', 
        'avançado': 'advanced'
      };

      const courseData = {
        ...courseForm,
        thumbnail,
        level: levelMapping[courseForm.level as keyof typeof levelMapping] || courseForm.level,
        tags: courseForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        price: Number(courseForm.price)
      };
      
      console.log('Final course data being saved:', courseData);
      console.log('Thumbnail in course data:', courseData.thumbnail);

      if (selectedCourse) {
        console.log('Updating course with ID:', selectedCourse._id);
        await updateCourseMutation.mutateAsync({ courseId: selectedCourse._id, courseData });
      } else {
        console.log('Creating new course');
        await createCourseMutation.mutateAsync(courseData);
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar curso');
    }
  };

  const handleDelete = (courseId: string) => {
    if (confirm('Tem certeza que deseja remover este curso? Esta ação não pode ser desfeita.')) {
      deleteCourseMutation.mutate(courseId);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestão de Cursos</h1>
          <p className="text-slate-400 mt-1">Gerencie cursos, módulos e conteúdo</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Curso
        </button>
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-900 rounded-lg p-6 border border-slate-800 animate-pulse">
              <div className="h-32 bg-slate-800 rounded mb-4" />
              <div className="h-4 bg-slate-800 rounded mb-2" />
              <div className="h-3 bg-slate-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (Array.isArray(courses) && courses.length > 0) ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course: any) => (
            <div key={course._id} className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden hover:border-coral/50 transition-colors">
              {/* Course Image */}
              <div className="h-32 bg-slate-800 flex items-center justify-center">
                {course.thumbnail ? (
                  <img 
                    src={course.thumbnail} 
                    alt={course.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image failed to load:', course.thumbnail);
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log('Image loaded successfully:', course.thumbnail);
                    }}
                  />
                ) : (
                  <BookOpen className="w-12 h-12 text-slate-600" />
                )}
              </div>

              {/* Course Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white line-clamp-2">
                    {course.title}
                  </h3>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => openEditModal(course)}
                      className="p-1 text-slate-400 hover:text-coral transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(course._id)}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                  {course.shortDescription || course.description}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Users className="w-3 h-3" />
                      <span>{course.enrolledCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{course.duration || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      course.isPublished 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {course.isPublished ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>
                </div>

                {course.level && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <span className="text-xs text-slate-500 uppercase tracking-wider">
                      Nível: {course.level}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex gap-2">
                  <button 
                    onClick={() => navigate(`/admin/courses/${course._id}/modules`)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Módulos
                  </button>
                  <button 
                    onClick={() => window.open(`/course/${course._id}`, '_blank')}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Visualizar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nenhum curso encontrado</h3>
          <p className="text-slate-400 mb-6">Comece criando seu primeiro curso</p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar Primeiro Curso
          </button>
        </div>
      )}

      {/* Course Form Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-6">
              {selectedCourse ? 'Editar Curso' : 'Criar Novo Curso'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Título do Curso *
                  </label>
                  <input
                    type="text"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Descrição Curta
                  </label>
                  <input
                    type="text"
                    value={courseForm.shortDescription}
                    onChange={(e) => setCourseForm({ ...courseForm, shortDescription: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                    placeholder="Breve descrição do curso"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Descrição Completa <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    rows={4}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                    placeholder="Descrição detalhada do curso"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nível
                  </label>
                  <select
                    value={courseForm.level}
                    onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                  >
                    <option value="iniciante">Iniciante</option>
                    <option value="intermediario">Intermediário</option>
                    <option value="avancado">Avançado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Duração
                  </label>
                  <input
                    type="text"
                    value={courseForm.duration}
                    onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                    placeholder="Ex: 8 semanas, 40 horas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Preço (R$)
                  </label>
                  <input
                    type="number"
                    value={courseForm.price}
                    onChange={(e) => setCourseForm({ ...courseForm, price: Number(e.target.value) })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                    placeholder="Ex: Jiu-Jitsu, Defesa Pessoal"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Imagem do Curso
                  </label>
                  
                  {/* Image Preview */}
                  {uploadPreview && (
                    <div className="relative mb-4">
                      <img 
                        src={uploadPreview} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  {!uploadPreview && (
                    <div className="space-y-3">
                      {/* File Upload */}
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-800 hover:bg-slate-700 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-3 text-slate-400" />
                            <p className="mb-2 text-sm text-slate-400">
                              <span className="font-semibold">Clique para enviar</span> ou arraste a imagem
                            </p>
                            <p className="text-xs text-slate-500">PNG, JPG, GIF, WEBP (MAX. 5MB)</p>
                          </div>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileSelect}
                          />
                        </label>
                      </div>
                      
                      {/* OR Divider */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-700" />
                        <span className="text-xs text-slate-500">OU</span>
                        <div className="flex-1 h-px bg-slate-700" />
                      </div>
                      
                      {/* URL Input */}
                      <input
                        type="url"
                        value={courseForm.thumbnail}
                        onChange={(e) => {
                          setCourseForm({ ...courseForm, thumbnail: e.target.value });
                          if (e.target.value) {
                            setUploadPreview(e.target.value);
                          }
                        }}
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={courseForm.tags}
                    onChange={(e) => setCourseForm({ ...courseForm, tags: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                    placeholder="jiu-jitsu, defesa-pessoal, esporte"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={courseForm.isPublished}
                      onChange={(e) => setCourseForm({ ...courseForm, isPublished: e.target.checked })}
                      className="w-4 h-4 text-coral bg-slate-800 border-slate-700 rounded focus:ring-coral"
                    />
                    <span className="text-sm text-slate-300">Publicar curso imediatamente</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="flex-1 py-2 px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createCourseMutation.isPending || updateCourseMutation.isPending || isUploading}
                  className="flex-1 py-2 px-4 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Upload className="w-4 h-4 animate-pulse" />
                      Enviando imagem...
                    </>
                  ) : createCourseMutation.isPending || updateCourseMutation.isPending ? (
                    'Salvando...'
                  ) : selectedCourse ? (
                    'Atualizar Curso'
                  ) : (
                    'Criar Curso'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}