import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  GripVertical,
  Play,
  FileText,
  HelpCircle,
  Youtube,
  Globe,
  Check,
  AlertCircle,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Question {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  xpReward?: number;
}

interface LessonFormData {
  title: string;
  description: string;
  type: 'video' | 'text' | 'quiz';
  order: number;
  duration: number;
  content: string;
  videoUrl: string;
  videoProvider: string;
  videoId: string;
  questions: Question[];
  isFree: boolean;
  xpReward: number;
  requiredToPass?: number; // For quiz lessons
}

interface LessonEditorProps {
  lesson?: any;
  moduleId: string;
  onSave: (data: LessonFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const LessonEditor: React.FC<LessonEditorProps> = ({
  lesson,
  moduleId,
  onSave,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<LessonFormData>({
    title: '',
    description: '',
    type: 'video',
    order: 1,
    duration: 10,
    content: '',
    videoUrl: '',
    videoProvider: 'youtube',
    videoId: '',
    questions: [],
    isFree: false,
    xpReward: 50,
    requiredToPass: 70
  });

  const [currentQuestion, setCurrentQuestion] = useState<Question>({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    xpReward: 10
  });

  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lesson) {
      setFormData({
        title: lesson.title || '',
        description: lesson.description || '',
        type: lesson.type || 'video',
        order: lesson.order || 1,
        duration: lesson.duration || 10,
        content: lesson.content || '',
        videoUrl: lesson.videoUrl || '',
        videoProvider: lesson.videoProvider || 'youtube',
        videoId: lesson.videoId || '',
        questions: lesson.questions || [],
        isFree: lesson.isFree || false,
        xpReward: lesson.xpReward || 50,
        requiredToPass: lesson.requiredToPass || 70
      });
    }
  }, [lesson]);

  const handleVideoUrlChange = (url: string) => {
    setFormData({ ...formData, videoUrl: url });
    
    // Auto-detect and extract video ID
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
      if (match) {
        setFormData(prev => ({
          ...prev,
          videoUrl: url,
          videoProvider: 'youtube',
          videoId: match[1]
        }));
      }
    } else if (url.includes('vimeo.com')) {
      const match = url.match(/vimeo\.com\/(\d+)/);
      if (match) {
        setFormData(prev => ({
          ...prev,
          videoUrl: url,
          videoProvider: 'vimeo',
          videoId: match[1]
        }));
      }
    }
  };

  const addOrUpdateQuestion = () => {
    if (!currentQuestion.question || currentQuestion.options.some(opt => !opt)) {
      toast.error('Preencha a pergunta e todas as opções');
      return;
    }

    const newQuestions = [...formData.questions];
    
    if (editingQuestionIndex !== null) {
      newQuestions[editingQuestionIndex] = currentQuestion;
      setEditingQuestionIndex(null);
    } else {
      newQuestions.push({ ...currentQuestion, id: Date.now().toString() });
    }
    
    setFormData({ ...formData, questions: newQuestions });
    setCurrentQuestion({
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      xpReward: 10
    });
  };

  const editQuestion = (index: number) => {
    setCurrentQuestion(formData.questions[index]);
    setEditingQuestionIndex(index);
  };

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index)
    });
  };

  const calculateTotalQuizXP = () => {
    return formData.questions.reduce((total, q) => total + (q.xpReward || 10), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title) {
      toast.error('Título é obrigatório');
      return;
    }

    if (formData.type === 'quiz' && formData.questions.length === 0) {
      toast.error('Adicione pelo menos uma questão ao quiz');
      return;
    }

    if (formData.type === 'video' && !formData.videoUrl) {
      toast.error('URL do vídeo é obrigatória');
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving lesson:', error);
    }
  };

  const getLessonIcon = () => {
    switch (formData.type) {
      case 'video': return <Play className="w-5 h-5" />;
      case 'text': return <FileText className="w-5 h-5" />;
      case 'quiz': return <HelpCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 rounded-lg w-full max-w-4xl my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                formData.type === 'video' ? 'bg-blue-900/30 text-blue-400' :
                formData.type === 'text' ? 'bg-green-900/30 text-green-400' :
                'bg-purple-900/30 text-purple-400'
              }`}>
                {getLessonIcon()}
              </div>
              <h2 className="text-xl font-semibold text-white">
                {lesson ? 'Editar Aula' : 'Nova Aula'}
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Título da Aula *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                placeholder="Ex: Como fazer pesquisa de palavras-chave"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tipo de Aula *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
              >
                <option value="video">📹 Vídeo</option>
                <option value="text">📝 Texto</option>
                <option value="quiz">❓ Quiz</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Duração (minutos)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Ordem na Lista
              </label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Star className="w-4 h-4 inline mr-1 text-yellow-400" />
                Recompensa XP
              </label>
              <input
                type="number"
                value={formData.xpReward}
                onChange={(e) => setFormData({ ...formData, xpReward: parseInt(e.target.value) })}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                min="0"
                max="500"
              />
              <p className="text-xs text-slate-500 mt-1">
                XP ganho ao completar a aula
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-coral"
                placeholder="Breve descrição do conteúdo da aula..."
              />
            </div>
          </div>

          {/* Video Content */}
          {formData.type === 'video' && (
            <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-400" />
                Configurações do Vídeo
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Provedor
                  </label>
                  <select
                    value={formData.videoProvider}
                    onChange={(e) => setFormData({ ...formData, videoProvider: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="custom">URL Personalizada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    URL do Vídeo *
                  </label>
                  <input
                    type="url"
                    value={formData.videoUrl}
                    onChange={(e) => handleVideoUrlChange(e.target.value)}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    placeholder="https://youtube.com/watch?v=..."
                    required={formData.type === 'video'}
                  />
                </div>

                {formData.videoId && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-green-400 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      ID do vídeo detectado: {formData.videoId}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Text Content */}
          {formData.type === 'text' && (
            <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-400" />
                Conteúdo de Texto
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Conteúdo HTML
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm"
                  placeholder="<h2>Título</h2>&#10;<p>Conteúdo da aula...</p>&#10;<ul>&#10;  <li>Item 1</li>&#10;  <li>Item 2</li>&#10;</ul>"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use HTML para formatar o conteúdo (h2, p, ul, li, strong, etc.)
                </p>
              </div>
            </div>
          )}

          {/* Quiz Content */}
          {formData.type === 'quiz' && (
            <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-purple-400" />
                  Questões do Quiz
                </h3>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400">
                    Total XP: {calculateTotalQuizXP()}
                  </span>
                  <span className="text-sm text-slate-400">
                    {formData.questions.length} questões
                  </span>
                </div>
              </div>

              {/* Pass requirement */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Porcentagem para Passar (%)
                </label>
                <input
                  type="number"
                  value={formData.requiredToPass}
                  onChange={(e) => setFormData({ ...formData, requiredToPass: parseInt(e.target.value) })}
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  min="0"
                  max="100"
                />
              </div>

              {/* Question Editor */}
              <div className="p-4 bg-slate-900 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-white">
                    {editingQuestionIndex !== null ? 'Editar Questão' : 'Adicionar Questão'}
                  </h4>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">XP:</label>
                    <input
                      type="number"
                      value={currentQuestion.xpReward}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, xpReward: parseInt(e.target.value) })}
                      className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                  placeholder="Digite a pergunta..."
                />
                
                <div className="space-y-2">
                  {currentQuestion.options.map((option, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correctAnswer"
                        checked={currentQuestion.correctAnswer === idx}
                        onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: idx })}
                        className="text-coral"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...currentQuestion.options];
                          newOptions[idx] = e.target.value;
                          setCurrentQuestion({ ...currentQuestion, options: newOptions });
                        }}
                        className="flex-1 p-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                        placeholder={`Opção ${idx + 1}`}
                      />
                      {currentQuestion.correctAnswer === idx && (
                        <Check className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                  ))}
                </div>
                
                <input
                  type="text"
                  value={currentQuestion.explanation || ''}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
                  placeholder="Explicação da resposta correta (opcional)"
                />
                
                <button
                  type="button"
                  onClick={addOrUpdateQuestion}
                  className="px-4 py-2 bg-coral text-white text-sm rounded hover:bg-coral-dark transition-colors"
                >
                  {editingQuestionIndex !== null ? 'Atualizar Questão' : 'Adicionar Questão'}
                </button>
              </div>

              {/* Questions List */}
              {formData.questions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-white">Questões Adicionadas:</h4>
                  {formData.questions.map((q, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-white font-medium">{idx + 1}.</span>
                        <span className="text-sm text-slate-300">{q.question}</span>
                        <span className="text-xs px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded">
                          {q.xpReward} XP
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => editQuestion(idx)}
                          className="p-1 text-slate-400 hover:text-coral"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(idx)}
                          className="p-1 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Access Settings */}
          <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFree}
                onChange={(e) => setFormData({ ...formData, isFree: e.target.checked })}
                className="w-4 h-4 text-coral bg-slate-800 border-slate-700 rounded focus:ring-coral"
              />
              <span className="text-sm text-slate-300">Aula Gratuita</span>
            </label>
            <span className="text-xs text-slate-500">
              Acessível sem assinatura (preview)
            </span>
          </div>

          {/* XP Summary */}
          <div className="p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg border border-yellow-800/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-medium">Resumo de XP</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-400">
                  {formData.type === 'quiz' ? calculateTotalQuizXP() : formData.xpReward} XP
                </div>
                <div className="text-xs text-slate-400">
                  {formData.type === 'quiz' ? 'Total do Quiz' : 'Por Conclusão'}
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 py-2 px-4 bg-coral text-white rounded-lg hover:bg-coral-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>Salvando...</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {lesson ? 'Atualizar Aula' : 'Criar Aula'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Add missing import
import { Edit } from 'lucide-react';